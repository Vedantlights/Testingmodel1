import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserChatRooms, listenToMessages, sendMessage as firebaseSendMessage, getChatRoomDetails } from '../../services/firebase.service';
import { propertiesAPI, chatAPI } from '../../services/api.service';
import MyChatBox from '../../MyChatBox/MyChatBox';
import '../styles/ChatUs.css';

const ChatUs = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chatId');
  const ownerNameFromUrl = searchParams.get('ownerName');
  const propertyIdFromUrl = searchParams.get('propertyId');
  const [propertyOwners, setPropertyOwners] = useState([]);

  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [messages, setMessages] = useState([]);
  const [allChatMessages, setAllChatMessages] = useState({}); // Store messages from all chat rooms
  const [readMessages, setReadMessages] = useState({}); // Track which messages have been read per chat room
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const unsubscribeMessagesRef = useRef(null);
  const allUnsubscribesRef = useRef({}); // Track all message listeners
  
  // Property cache for chat rooms
  const [propertyCache, setPropertyCache] = useState({});

  // Format message time helper function
  const formatMessageTime = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const msgDate = date instanceof Date ? date : new Date(date);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return msgDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Load chat rooms from Firebase
  useEffect(() => {
    const loadChatRooms = async () => {
      if (!user || user.user_type !== 'buyer') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const chatRooms = await getUserChatRooms(user.id);
        
        // If chatId from URL but not in loaded chat rooms, fetch it directly
        if (chatIdFromUrl && !chatRooms.find(r => r.id === chatIdFromUrl)) {
          try {
            const chatRoomDetails = await getChatRoomDetails(chatIdFromUrl);
            if (chatRoomDetails) {
              chatRooms.push(chatRoomDetails);
            }
          } catch (error) {
            console.error('Error fetching chat room details from URL:', error);
          }
        }
        
        // Fetch property details for each chat room
        const ownersWithProperties = await Promise.all(
          chatRooms.map(async (room) => {
            try {
              // Get property details
              let property = propertyCache[room.propertyId];
              if (!property) {
                const propResponse = await propertiesAPI.getDetails(room.propertyId);
                if (propResponse.success && propResponse.data?.property) {
                  property = propResponse.data.property;
                  setPropertyCache(prev => ({ ...prev, [room.propertyId]: property }));
                }
              }

              // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
              // NO fallback, NO manual selection - ONLY from property data
              let receiverId, receiverRole;
              const ownerUserType = property?.user_type || property?.seller?.user_type;
              
              if (ownerUserType === 'agent') {
                // Property owner is an agent
                receiverId = property?.user_id || property?.seller?.id;
                receiverRole = 'agent';
              } else {
                // Property owner is a seller
                receiverId = property?.user_id || property?.seller?.id;
                receiverRole = 'seller';
              }
              
              // Validate receiverId exists
              if (!receiverId) {
                console.error('Cannot determine receiver from property data:', property);
                return null;
              }
              
              return {
                id: room.id,
                chatRoomId: room.id,
                receiverId: receiverId,
                receiverRole: receiverRole,
                propertyId: room.propertyId,
                name: property?.seller?.name || property?.seller?.full_name || 'Property Owner',
                propertyTitle: property?.title || 'Property',
                propertyType: property?.property_type || '',
                location: property?.location || '',
                price: property?.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}` : '',
                image: property?.seller?.profile_image || property?.cover_image || 'https://via.placeholder.com/60',
                lastMessage: room.lastMessage || '',
                lastMessageTime: formatMessageTime(room.updatedAt),
                unread: 0, // TODO: Implement unread count
                status: 'offline' // TODO: Implement online status
              };
            } catch (error) {
              console.error('Error loading property for chat room:', error);
              return null;
            }
          })
        );

        const validOwners = ownersWithProperties.filter(owner => owner !== null && owner.id);
        setPropertyOwners(validOwners);
        
        // Priority: If chatId from URL, select that chat room first
        if (chatIdFromUrl) {
          const urlChatRoom = validOwners.find(owner => owner.chatRoomId === chatIdFromUrl);
          if (urlChatRoom) {
            console.log('✅ Found chat room from URL:', chatIdFromUrl);
            setSelectedOwner(urlChatRoom);
            setSelectedChatRoomId(urlChatRoom.chatRoomId);
          } else {
            // Chat room from URL not in list yet (might be brand new)
            console.log('⚠️ Chat room from URL not in list, fetching details...', chatIdFromUrl);
            setSelectedChatRoomId(chatIdFromUrl);
            
            // Create temp owner object immediately using URL params for instant display
            let tempOwner = null;
            const usePropertyId = propertyIdFromUrl || null;
            
            if (ownerNameFromUrl) {
              // Use owner name from URL for immediate display
              tempOwner = {
                id: chatIdFromUrl,
                chatRoomId: chatIdFromUrl,
                receiverId: null, // Will be fetched
                receiverRole: 'seller',
                propertyId: usePropertyId,
                name: decodeURIComponent(ownerNameFromUrl),
                propertyTitle: 'Property',
                propertyType: '',
                location: '',
                price: '',
                image: 'https://via.placeholder.com/60',
                lastMessage: '',
                lastMessageTime: 'Just now',
                unread: 0,
                status: 'offline'
              };
              setSelectedOwner(tempOwner);
              // Add temp owner to propertyOwners list immediately so it appears in sidebar
              setPropertyOwners(prevOwners => {
                if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                  return [tempOwner, ...prevOwners];
                }
                return prevOwners;
              });
            }
            
            // Try to get chat room details and property info to complete the owner object
            try {
              const chatRoomDetails = await getChatRoomDetails(chatIdFromUrl);
              if (chatRoomDetails) {
                // Fetch property details
                const propId = chatRoomDetails.propertyId || usePropertyId;
                if (propId) {
                  const propResponse = await propertiesAPI.getDetails(propId);
                  if (propResponse.success && propResponse.data?.property) {
                    const property = propResponse.data.property;
                    
                    // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
                    // NO fallback, NO manual selection - ONLY from property data
                    let receiverId, receiverRole;
                    const ownerUserType = property.user_type || property.seller?.user_type;
                    
                    if (ownerUserType === 'agent') {
                      // Property owner is an agent
                      receiverId = property.user_id || property.seller?.id;
                      receiverRole = 'agent';
                    } else {
                      // Property owner is a seller
                      receiverId = property.user_id || property.seller?.id;
                      receiverRole = 'seller';
                    }
                    
                    // Validate receiverId exists
                    if (!receiverId) {
                      console.error('Cannot determine receiver from property data:', property);
                      return;
                    }
                    
                    const completeOwner = {
                      id: chatRoomDetails.id,
                      chatRoomId: chatRoomDetails.id,
                      receiverId: receiverId,
                      receiverRole: receiverRole,
                      propertyId: chatRoomDetails.propertyId,
                      name: property?.seller?.name || property?.seller?.full_name || ownerNameFromUrl || 'Property Owner',
                      propertyTitle: property?.title || 'Property',
                      propertyType: property?.property_type || '',
                      location: property?.location || '',
                      price: property?.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}` : '',
                      image: property?.seller?.profile_image || property?.cover_image || 'https://via.placeholder.com/60',
                      lastMessage: chatRoomDetails.lastMessage || '',
                      lastMessageTime: formatMessageTime(chatRoomDetails.updatedAt),
                      unread: 0,
                      status: 'offline'
                    };
                    setSelectedOwner(completeOwner);
                    setSelectedChatRoomId(chatIdFromUrl);
                    // Add to propertyOwners list if not already there
                    setPropertyOwners(prevOwners => {
                      if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                        return [completeOwner, ...prevOwners];
                      }
                      return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? completeOwner : o);
                    });
                  } else if (tempOwner) {
                    // Update temp owner with chat room details even if property fetch failed
                    // Use receiverId and receiverRole from chatRoomDetails (should be correct from Firebase)
                    tempOwner.receiverId = chatRoomDetails.receiverId;
                    tempOwner.receiverRole = chatRoomDetails.receiverRole || 'seller';
                    tempOwner.propertyId = chatRoomDetails.propertyId;
                    tempOwner.lastMessage = chatRoomDetails.lastMessage || '';
                    tempOwner.lastMessageTime = formatMessageTime(chatRoomDetails.updatedAt);
                    setSelectedOwner(tempOwner);
                    // Add to propertyOwners list if not already there
                    setPropertyOwners(prevOwners => {
                      if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                        return [tempOwner, ...prevOwners];
                      }
                      return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? tempOwner : o);
                    });
                  }
                } else if (tempOwner) {
                  // Update temp owner with chat room details
                  tempOwner.receiverId = chatRoomDetails.receiverId;
                  tempOwner.receiverRole = chatRoomDetails.receiverRole || 'seller';
                  tempOwner.propertyId = chatRoomDetails.propertyId;
                  tempOwner.lastMessage = chatRoomDetails.lastMessage || '';
                  tempOwner.lastMessageTime = formatMessageTime(chatRoomDetails.updatedAt);
                  setSelectedOwner(tempOwner);
                  // Add to propertyOwners list if not already there
                  setPropertyOwners(prevOwners => {
                    if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                      return [tempOwner, ...prevOwners];
                    }
                    return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? tempOwner : o);
                  });
                }
              } else if (tempOwner) {
                // Chat room doesn't exist yet, but we have temp owner from URL
                // This is fine - user can still see the owner name and chat will be created on first message
                console.log('Chat room not found in Firebase yet, using temp owner from URL');
              }
            } catch (error) {
              console.error('Error fetching chat room details from URL:', error);
              // If we have temp owner, keep it
              if (!tempOwner && ownerNameFromUrl) {
                // Create minimal temp owner even if all fetches fail
                // receiverId and receiverRole will be resolved when property is fetched or on first message
                const minimalOwner = {
                  id: chatIdFromUrl,
                  chatRoomId: chatIdFromUrl,
                  receiverId: null,
                  receiverRole: null, // Will be resolved from property
                  propertyId: usePropertyId,
                  name: decodeURIComponent(ownerNameFromUrl),
                  propertyTitle: 'Property',
                  propertyType: '',
                  location: '',
                  price: '',
                  image: 'https://via.placeholder.com/60',
                  lastMessage: '',
                  lastMessageTime: 'Just now',
                  unread: 0,
                  status: 'offline'
                };
                setSelectedOwner(minimalOwner);
              }
            }
          }
        } else if (validOwners.length > 0 && !selectedOwner) {
          // If no URL chatId, select first owner
          setSelectedOwner(validOwners[0]);
          setSelectedChatRoomId(validOwners[0].chatRoomId);
        }
      } catch (error) {
        console.error('Error loading chat rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatRooms();
  }, [user, chatIdFromUrl]);
  
  // Calculate unread chat messages count across all chat rooms
  // Unread = messages from sellers/agents that haven't been viewed by the buyer
  const unreadChatCount = useMemo(() => {
    let count = 0;
    Object.keys(allChatMessages).forEach(chatRoomId => {
      const messages = allChatMessages[chatRoomId] || [];
      if (!Array.isArray(messages) || messages.length === 0) return;
      
      const readUpTo = readMessages[chatRoomId];
      const isSelected = selectedChatRoomId === chatRoomId;
      
      // If this is the selected chat room, don't count unread (user is viewing it)
      if (isSelected) return;
      
      // If readUpTo is undefined, all seller/agent messages are unread
      // Otherwise, count seller/agent messages after the last read position
      if (readUpTo === undefined || readUpTo === 0) {
        const sellerMessages = messages.filter(msg => msg.sender === 'owner');
        count += sellerMessages.length;
      } else {
        // Count seller/agent messages that are unread (after readUpTo position)
        const unread = messages.filter((msg, index) => 
          msg.sender === 'owner' && index >= readUpTo
        ).length;
        count += unread;
      }
    });
    return count;
  }, [allChatMessages, readMessages, selectedChatRoomId]);

  // Notify parent/navbar of unread count changes via custom event
  useEffect(() => {
    const event = new CustomEvent('buyerUnreadCountChange', { detail: unreadChatCount });
    window.dispatchEvent(event);
  }, [unreadChatCount]);

  // Listen to messages from ALL chat rooms to track unread count
  useEffect(() => {
    if (!user || user.user_type !== 'buyer' || propertyOwners.length === 0) return;

    // Set up listeners for all chat rooms
    propertyOwners.forEach(owner => {
      const chatRoomId = owner.chatRoomId;
      if (!chatRoomId) return;
      
      // Skip if already listening
      if (allUnsubscribesRef.current[chatRoomId]) return;

      const unsubscribe = listenToMessages(chatRoomId, (firebaseMessages, error) => {
        if (error) {
          console.error('Error in buyer chat listener for room:', chatRoomId, error);
          return;
        }

        if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
          console.error('Invalid messages received for room:', chatRoomId);
          return;
        }

        const transformed = firebaseMessages.map((msg) => {
          let date;
          if (msg.timestamp instanceof Date) {
            date = msg.timestamp;
          } else if (msg.timestamp) {
            date = new Date(msg.timestamp);
          } else {
            date = new Date();
          }

          return {
            id: msg.id || `${chatRoomId}-${date.getTime()}-${Math.random()}`,
            text: msg.text || '',
            sender: msg.senderId === String(user.id) ? 'user' : 'owner',
            timestamp: date.toISOString()
          };
        });

        // Store messages for this chat room
        setAllChatMessages(prev => ({
          ...prev,
          [chatRoomId]: transformed
        }));
      });

      allUnsubscribesRef.current[chatRoomId] = unsubscribe;
    });

    // Cleanup: unsubscribe from chat rooms that are no longer in the list
    return () => {
      Object.keys(allUnsubscribesRef.current).forEach(chatRoomId => {
        if (!propertyOwners.find(owner => owner.chatRoomId === chatRoomId)) {
          if (allUnsubscribesRef.current[chatRoomId]) {
            allUnsubscribesRef.current[chatRoomId]();
            delete allUnsubscribesRef.current[chatRoomId];
          }
        }
      });
    };
  }, [user, propertyOwners]);

  // Mark messages as read when chat room is viewed
  useEffect(() => {
    if (selectedChatRoomId) {
      const messages = allChatMessages[selectedChatRoomId] || [];
      if (Array.isArray(messages) && messages.length > 0) {
        setReadMessages(prev => {
          const currentReadUpTo = prev[selectedChatRoomId];
          // Only update if not already marked as read
          if (currentReadUpTo !== messages.length) {
            return {
              ...prev,
              [selectedChatRoomId]: messages.length
            };
          }
          return prev;
        });
      }
    }
  }, [selectedChatRoomId, allChatMessages]);

  // Refresh chat rooms periodically to update last message timestamps
  useEffect(() => {
    if (!user || user.user_type !== 'buyer') return;
    
    const interval = setInterval(async () => {
      try {
        const chatRooms = await getUserChatRooms(user.id);
        
        // Update propertyOwners list with latest chat room data
        setPropertyOwners(prevOwners => {
          return prevOwners.map(owner => {
            const updatedRoom = chatRooms.find(room => room.id === owner.chatRoomId);
            if (updatedRoom) {
              return {
                ...owner,
                lastMessage: updatedRoom.lastMessage || owner.lastMessage,
                lastMessageTime: formatMessageTime(updatedRoom.updatedAt)
              };
            }
            return owner;
          });
        });
      } catch (error) {
        console.error('Error refreshing chat rooms:', error);
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Lock page scroll position - prevent any scrolling
  useEffect(() => {
    // Lock scroll on mount
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      // Cleanup message listener
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, []);

  // Handle owner selection
  const handleOwnerSelect = (owner) => {
    setSelectedOwner(owner);
    setSelectedChatRoomId(owner.chatRoomId);
    setIsSidebarOpen(false);
    setMessages([]); // Clear messages while loading
  };

  // Listen to messages when chat room is selected (use chatIdFromUrl as fallback)
  useEffect(() => {
    const chatRoomId = selectedChatRoomId || chatIdFromUrl;
    if (!chatRoomId || !user) {
      console.log('Message listener skipped:', { selectedChatRoomId, chatIdFromUrl, hasUser: !!user });
      return;
    }

    console.log('Setting up message listener for chat room:', chatRoomId);

    // Unsubscribe from previous listener
    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current();
      unsubscribeMessagesRef.current = null;
    }

    // Subscribe to messages
    unsubscribeMessagesRef.current = listenToMessages(chatRoomId, (firebaseMessages, error) => {
      if (error) {
        console.error('Error in message listener:', error);
        return;
      }
      
      if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
        console.error('Invalid messages received');
        return;
      }
      
      console.log('Received messages:', firebaseMessages.length);
      
      // Transform Firebase messages to match UI structure
      const transformedMessages = firebaseMessages.map((msg, index) => {
        let timestamp = 'Just now';
        if (msg.timestamp) {
          try {
            const date = msg.timestamp instanceof Date 
              ? msg.timestamp 
              : new Date(msg.timestamp);
            timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            console.error('Error parsing timestamp:', e);
          }
        }
        
        return {
          id: msg.id || `${chatRoomId}-${index}-${Date.now()}`,
          text: msg.text || '',
          sender: msg.senderId === String(user.id) ? 'user' : 'owner',
          timestamp
        };
      });
      setMessages(transformedMessages);
      
      // Update chat room list with last message and timestamp
      if (firebaseMessages.length > 0) {
        const lastMessage = firebaseMessages[firebaseMessages.length - 1];
        const lastMsgText = lastMessage.text || '';
        let lastMsgTime = new Date();
        if (lastMessage.timestamp) {
          lastMsgTime = lastMessage.timestamp instanceof Date 
            ? lastMessage.timestamp 
            : new Date(lastMessage.timestamp);
        }
        
        // Update the chat room in propertyOwners list
        setPropertyOwners(prevOwners => {
          const updatedOwners = prevOwners.map(owner => {
            if (owner.chatRoomId === chatRoomId) {
              return {
                ...owner,
                lastMessage: lastMsgText,
                lastMessageTime: formatMessageTime(lastMsgTime)
              };
            }
            return owner;
          });
          
          // If chat room not in list but we have selectedOwner, add it
          if (!updatedOwners.find(o => o.chatRoomId === chatRoomId) && selectedOwner) {
            updatedOwners.unshift({
              ...selectedOwner,
              lastMessage: lastMsgText,
              lastMessageTime: formatMessageTime(lastMsgTime)
            });
          }
          
          return updatedOwners;
        });
      }
    });

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
        unsubscribeMessagesRef.current = null;
      }
    };
  }, [selectedChatRoomId, chatIdFromUrl, user, selectedOwner]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '' || !user) {
      console.error('Cannot send message - missing data:', { 
        user: !!user, 
        message: inputMessage.trim() 
      });
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage(''); // Clear input immediately for better UX

    try {
      // Resolve receiver and propertyId STRICTLY from property data
      // Chat room is created ONLY when first message is sent
      let receiverId, receiverRole, propertyId;
      
      // Try to get receiver from selectedOwner first
      if (selectedOwner && selectedOwner.receiverId && selectedOwner.propertyId) {
        receiverId = selectedOwner.receiverId;
        receiverRole = selectedOwner.receiverRole;
        propertyId = selectedOwner.propertyId;
      } else if (propertyIdFromUrl) {
        // Fetch property to resolve receiver STRICTLY based on property owner's user_type
        const propResponse = await propertiesAPI.getDetails(propertyIdFromUrl);
        if (!propResponse.success || !propResponse.data?.property) {
          throw new Error('Property not found');
        }
        
        const property = propResponse.data.property;
        
        // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
        // NO fallback, NO manual selection - ONLY from property data
        const ownerUserType = property.user_type || property.seller?.user_type;
        
        if (ownerUserType === 'agent') {
          // Property owner is an agent
          receiverId = property.user_id || property.seller?.id;
          receiverRole = 'agent';
        } else {
          // Property owner is a seller
          receiverId = property.user_id || property.seller?.id;
          receiverRole = 'seller';
        }
        
        if (!receiverId) {
          throw new Error('Could not determine receiver from property data. Property owner user_type is required.');
        }
        
        propertyId = propertyIdFromUrl;
      } else {
        throw new Error('Property information is missing. Cannot determine receiver.');
      }
      
      // Generate chat room ID to check if it's a new conversation
      const { generateChatRoomId, createOrGetChatRoom, getChatRoomDetails } = await import('../../services/firebase.service');
      const generatedChatRoomId = generateChatRoomId(user.id, receiverId, propertyId);
      
      // Check if this is a new chat room (first message for this buyer-property-seller)
      let isNewChatRoom = false;
      try {
        const existingRoom = await getChatRoomDetails(generatedChatRoomId);
        isNewChatRoom = !existingRoom;
      } catch (error) {
        // Room doesn't exist, this is a new conversation
        isNewChatRoom = true;
      }
      
      // If this is a NEW chat room (first message), call backend API to create/check inquiry
      // This ensures inquiry is created only once per buyer-property-seller combination
      if (isNewChatRoom) {
        try {
          console.log('📞 First message - Creating/checking inquiry via backend API...');
          const response = await chatAPI.createRoom(receiverId, propertyId);
          if (response.success) {
            console.log('✅ Inquiry created/checked successfully:', response.data);
          }
        } catch (error) {
          console.warn('⚠️ Failed to create/check inquiry via backend API, continuing with Firebase chat room creation:', error);
          // Continue even if backend API fails - Firebase chat room will still be created
        }
      }
      
      // ALWAYS ensure chat room exists in Firebase before sending message
      // createOrGetChatRoom will get existing room or create new one
      const finalChatRoomId = await createOrGetChatRoom(
        user.id,
        receiverId,
        receiverRole,
        propertyId
      );
      
      // Update selectedChatRoomId and selectedOwner with the chat room ID
      setSelectedChatRoomId(finalChatRoomId);
      if (selectedOwner) {
        setSelectedOwner({
          ...selectedOwner,
          chatRoomId: finalChatRoomId,
          receiverId: receiverId,
          receiverRole: receiverRole,
          propertyId: propertyId
        });
      }
      
      // Send message to Firebase
      await firebaseSendMessage(
        finalChatRoomId,
        user.id,
        user.user_type,
        messageText
      );
      console.log('✅ Message sent successfully');
      
      // Update chat room list immediately with the sent message
      const now = new Date();
      setPropertyOwners(prevOwners => {
        const updatedOwners = prevOwners.map(owner => {
          if (owner.chatRoomId === finalChatRoomId) {
            return {
              ...owner,
              lastMessage: messageText,
              lastMessageTime: formatMessageTime(now)
            };
          }
          return owner;
        });
        
        // If chat room not in list but we have selectedOwner, add it to the list
        if (!updatedOwners.find(o => o.chatRoomId === finalChatRoomId) && selectedOwner) {
          const newOwner = {
            ...selectedOwner,
            chatRoomId: finalChatRoomId,
            lastMessage: messageText,
            lastMessageTime: formatMessageTime(now)
          };
          // Add to beginning of list (most recent)
          updatedOwners.unshift(newOwner);
        }
        
        return updatedOwners;
      });
      
      // Message will also be added via real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setInputMessage(messageText);
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      alert(errorMessage);
    }
  };

  const quickReplies = [
    "When can I visit?",
    "Is it still available?",
    "Tell me about amenities",
    "Can we negotiate price?"
  ];

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
  };

  return (
    <MyChatBox
      // Sidebar props
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      propertyOwners={propertyOwners}
      selectedOwner={selectedOwner}
      onOwnerSelect={handleOwnerSelect}
      loading={loading}
      
      // Messages props
      messages={messages}
      isTyping={isTyping}
      
      // Input props
      inputMessage={inputMessage}
      onInputChange={(value) => setInputMessage(value)}
      onSendMessage={handleSendMessage}
      quickReplies={quickReplies}
      showQuickReplies={messages.length <= 3}
      onQuickReply={handleQuickReply}
    />
  );
};

export default ChatUs;
