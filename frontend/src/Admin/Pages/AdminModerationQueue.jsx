import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import './AdminModerationQueue.css';

const AdminModerationQueue = () => {
  const [queueItems, setQueueItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const limit = 20;

  // Fetch queue items
  const fetchQueue = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_MODERATION_QUEUE}?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch moderation queue');
      }

      const data = await response.json();
      
      if (data.success) {
        setQueueItems(data.data.items || []);
        setTotalCount(data.data.total || 0);
        setCurrentPage(page);
      } else {
        throw new Error(data.message || 'Failed to fetch queue');
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      showToast('Failed to load moderation queue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(currentPage);
  }, []);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Approve image
  const handleApprove = async (itemId) => {
    setIsProcessing(true);
    const notes = reviewNotes[itemId] || '';

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_MODERATION_APPROVE}?id=${itemId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ review_notes: notes }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve image');
      }

      const data = await response.json();

      if (data.success) {
        // Remove item from queue
        setQueueItems(prev => prev.filter(item => item.id !== itemId));
        setTotalCount(prev => prev - 1);
        setReviewNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[itemId];
          return newNotes;
        });
        showToast('Image approved successfully', 'success');
      } else {
        throw new Error(data.message || 'Failed to approve');
      }
    } catch (error) {
      console.error('Error approving image:', error);
      showToast('Failed to approve image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject image
  const handleReject = async (itemId) => {
    setIsProcessing(true);
    const notes = reviewNotes[itemId] || '';

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_MODERATION_REJECT}?id=${itemId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ review_notes: notes }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject image');
      }

      const data = await response.json();

      if (data.success) {
        // Remove item from queue
        setQueueItems(prev => prev.filter(item => item.id !== itemId));
        setTotalCount(prev => prev - 1);
        setReviewNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[itemId];
          return newNotes;
        });
        showToast('Image rejected successfully', 'success');
      } else {
        throw new Error(data.message || 'Failed to reject');
      }
    } catch (error) {
      console.error('Error rejecting image:', error);
      showToast('Failed to reject image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate time in queue
  const getTimeInQueue = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / limit);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchQueue(newPage);
    }
  };

  return (
    <div className="admin-moderation-queue">
      <div className="moderation-header">
        <h1>Image Moderation Queue</h1>
        <div className="queue-count">
          {totalCount} image{totalCount !== 1 ? 's' : ''} pending review
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading moderation queue...</p>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h2>No images pending review</h2>
          <p>All images have been reviewed. Check back later for new submissions.</p>
        </div>
      ) : (
        <>
          <div className="queue-grid">
            {queueItems.map((item) => (
              <div key={item.id} className="queue-item">
                <div className="item-header">
                  <div className="item-info">
                    <span className="property-id">Property ID: {item.property_id}</span>
                    <span className="time-in-queue">
                      In queue: {getTimeInQueue(item.created_at)}
                    </span>
                  </div>
                </div>

                <div className="item-image">
                  <img
                    src={item.image_url || '/placeholder-image.jpg'}
                    alt={item.original_filename || 'Property image'}
                    onClick={() => setSelectedItem(item)}
                    className="thumbnail-image"
                  />
                </div>

                <div className="item-details">
                  <div className="reason-for-review">
                    <strong>Reason:</strong> {item.reason_for_review || 'Needs manual review'}
                  </div>

                  {item.confidence_scores && Object.keys(item.confidence_scores).length > 0 && (
                    <div className="confidence-scores">
                      <strong>Confidence Scores:</strong>
                      <div className="score-tags">
                        {Object.entries(item.confidence_scores).map(([key, value]) => (
                          <span key={key} className="score-tag">
                            {key}: {(value * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="review-notes-input">
                    <label>Review Notes (optional):</label>
                    <textarea
                      value={reviewNotes[item.id] || ''}
                      onChange={(e) =>
                        setReviewNotes(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))
                      }
                      placeholder="Add notes about your decision..."
                      rows="2"
                      className="notes-textarea"
                    />
                  </div>

                  <div className="action-buttons">
                    <button
                      className="approve-button"
                      onClick={() => handleApprove(item.id)}
                      disabled={isProcessing}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => handleReject(item.id)}
                      disabled={isProcessing}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="page-button"
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="page-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      {selectedItem && (
        <div className="image-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <img
              src={selectedItem.image_url || '/placeholder-image.jpg'}
              alt={selectedItem.original_filename || 'Property image'}
              className="modal-image"
            />
            <div className="modal-info">
              <p><strong>Property ID:</strong> {selectedItem.property_id}</p>
              <p><strong>Reason:</strong> {selectedItem.reason_for_review}</p>
              <p><strong>Filename:</strong> {selectedItem.original_filename}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminModerationQueue;

