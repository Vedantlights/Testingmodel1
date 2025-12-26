import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserCheck,
  MessageSquare,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../style/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [dateRange, setDateRange] = useState('7d'); // '7d', '30d', '90d', 'all'

  useEffect(() => {
    fetchDashboardStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        params.append('date_range', dateRange);
      }
      
      const url = `${API_BASE_URL}${API_ENDPOINTS.ADMIN_DASHBOARD_STATS}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Use HTTP-only cookie for authentication
      });

      // Get response text first to see if it's JSON
      const responseText = await response.text();
      console.log('Dashboard API Response Status:', response.status);
      console.log('Dashboard API Raw Response:', responseText.substring(0, 500));
      
      if (!response.ok) {
        // Try to parse as JSON to get error details
        let errorData = null;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // Not JSON, use raw text
        }
        
        const errorMessage = errorData?.message || errorData?.data?.message || 
          (response.status === 401 ? 'Authentication required. Please log in again.' :
           response.status === 403 ? 'Access denied. Insufficient permissions.' :
           response.status === 500 ? 'Server error. Please try again later.' :
           `HTTP error! status: ${response.status}`);
        
        setError(errorMessage);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        console.error('Response text:', responseText);
        setError('Invalid JSON response from server: ' + responseText.substring(0, 200));
        return;
      }
      
      console.log('Dashboard API Parsed Response:', data);

      if (data.success) {
        const statsData = data.data;
        
        // Format stats for display with navigation paths
        const formattedStats = [
          {
            title: 'Total Properties',
            value: statsData.total_properties?.toString() || '0',
            change: `${statsData.pending_properties || 0} pending`,
            trend: 'up',
            icon: Building2,
            color: '#3b82f6',
            path: '/admin/properties'
          },
          {
            title: 'Total Users',
            value: statsData.total_users?.toString() || '0',
            change: `${statsData.users_by_type?.buyer || 0} buyers, ${statsData.users_by_type?.seller || 0} sellers`,
            trend: 'up',
            icon: Users,
            color: '#8b5cf6',
            path: '/admin/users'
          },
          {
            title: 'Active Agents',
            value: statsData.total_agents?.toString() || '0',
            change: `${statsData.users_by_type?.agent || 0} total agents`,
            trend: 'up',
            icon: UserCheck,
            color: '#06b6d4',
            path: '/admin/agents'
          },
          {
            title: 'Total Inquiries',
            value: statsData.total_inquiries?.toString() || '0',
            change: `${statsData.new_inquiries || 0} new this week`,
            trend: 'up',
            icon: MessageSquare,
            color: '#10b981',
            path: '/admin/inquiries'
          },
          {
            title: 'Active Subscriptions',
            value: statsData.active_subscriptions?.toString() || '0',
            change: `${statsData.expired_subscriptions || 0} expired`,
            trend: 'up',
            icon: CreditCard,
            color: '#8b5cf6',
            path: '/admin/subscriptions'
          }
        ];

        setStats(formattedStats);
        setPropertyTypes(statsData.property_types_distribution || []);
        setRecentProperties(statsData.recent_properties || []);
        setRecentInquiries(statsData.recent_inquiries || []);
      } else {
        setError(data.message || 'Failed to load stats');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and ensure the backend server is running.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamic color palette for property types - generates colors based on type name hash
  const generateColorFromType = (typeName) => {
    if (!typeName) return '#64748b';
    
    // Hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < typeName.length; i++) {
      hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with good saturation and lightness
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getColorForType = (typeName) => {
    // Fallback to predefined colors for common types, otherwise generate dynamically
    const predefinedColors = {
      'Apartment': '#3b82f6',
      'House': '#10b981',
      'Villa': '#8b5cf6',
      'Commercial': '#f59e0b',
      'Land': '#06b6d4',
      'Plot': '#ef4444',
      'Office': '#6366f1'
    };
    
    return predefinedColors[typeName] || generateColorFromType(typeName);
  };

  // Calculate pie chart segments
  const calculatePieChart = () => {
    if (!propertyTypes || propertyTypes.length === 0) return null;
    
    const total = propertyTypes.reduce((sum, type) => sum + type.count, 0);
    if (total === 0) return null;

    const circumference = 2 * Math.PI * 80; // radius = 80
    let offset = 0;
    
    return propertyTypes.map((type, index) => {
      const percentage = (type.count / total) * 100;
      const dashArray = (percentage / 100) * circumference;
      const dashOffset = -offset;
      offset += dashArray;
      
      return {
        ...type,
        percentage: percentage.toFixed(1),
        dashArray: `${dashArray} ${circumference}`,
        dashOffset: dashOffset,
        color: getColorForType(type.name)
      };
    });
  };

  const pieSegments = calculatePieChart();

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Loading dashboard data...</p>
          </div>
        </div>
        
        {/* Loading Skeletons */}
        <div className="admin-stats-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="admin-stat-card" style={{ opacity: 0.6 }}>
              <div className="admin-stat-header">
                <div className="admin-stat-title" style={{ 
                  background: '#e2e8f0', 
                  height: '16px', 
                  width: '100px', 
                  borderRadius: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
                <div className="admin-stat-icon" style={{ 
                  background: '#e2e8f0',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
              </div>
              <div className="admin-stat-value" style={{ 
                background: '#e2e8f0', 
                height: '32px', 
                width: '80px', 
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <div style={{ 
                background: '#e2e8f0', 
                height: '14px', 
                width: '120px', 
                borderRadius: '4px',
                marginTop: '8px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
            </div>
          ))}
        </div>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <h1>Dashboard</h1>
          <div style={{ color: '#ef4444', marginTop: '20px' }}>
            <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your platform. <span style={{ fontSize: '12px', color: '#64748b' }}>(Auto-refreshes every 30s)</span></p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button 
            onClick={fetchDashboardStats}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="admin-stats-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isClickable = stat.path !== null;
            
            return (
              <div 
                key={index} 
                className={`admin-stat-card ${isClickable ? 'admin-stat-card-clickable' : ''}`}
                onClick={() => {
                  if (isClickable && stat.path) {
                    navigate(stat.path);
                  }
                }}
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }
                }}
              >
                <div className="admin-stat-content">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">{stat.title}</span>
                    <div className="admin-stat-icon" style={{ background: `${stat.color}20` }}>
                      <Icon style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stat.value}</div>

                  {stat.change && (
                    <div className={`admin-stat-change ${stat.trend}`}>
                      <span>{stat.change}</span>
                    </div>
                  )}
                  
                  {isClickable && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: stat.color,
                      fontWeight: '500',
                      opacity: 0.8
                    }}>
                      Click to view →
                    </div>
                  )}
                </div>    
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Activity Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Recent Properties */}
        <div className="admin-dashboard-card">
          <h2>Recent Properties</h2>
          {recentProperties.length > 0 ? (
            <div style={{ marginTop: '15px' }}>
              {recentProperties.map((property, index) => (
                <div key={property.id || index} style={{ 
                  padding: '12px', 
                  borderBottom: index < recentProperties.length - 1 ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                      {property.title || 'Untitled Property'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {property.seller_name || 'Unknown'} • ₹{property.price?.toLocaleString('en-IN') || '0'}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: property.is_active ? '#10b98120' : '#f59e0b20',
                    color: property.is_active ? '#10b981' : '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {property.is_active ? 'Active' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              No recent properties
            </p>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="admin-dashboard-card">
          <h2>Recent Inquiries</h2>
          {recentInquiries.length > 0 ? (
            <div style={{ marginTop: '15px' }}>
              {recentInquiries.map((inquiry, index) => (
                <div key={inquiry.id || index} style={{ 
                  padding: '12px', 
                  borderBottom: index < recentInquiries.length - 1 ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                      {inquiry.property_title || 'Property Inquiry'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {inquiry.buyer_name || 'Unknown Buyer'}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: inquiry.status === 'pending' ? '#f59e0b20' : '#10b98120',
                    color: inquiry.status === 'pending' ? '#f59e0b' : '#10b981',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {inquiry.status || 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              No recent inquiries
            </p>
          )}
        </div>
      </div>

      {/* Property Types */}
      {pieSegments && pieSegments.length > 0 ? (
        <div className="admin-dashboard-card" style={{ marginTop: '20px' }}>
          <h2>Property Types Distribution</h2>
          <div className="admin-pie-chart-container">
            <svg viewBox="0 0 200 200" className="admin-pie-chart">
              {pieSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="40"
                  strokeDasharray={segment.dashArray}
                  strokeDashoffset={segment.dashOffset}
                  transform="rotate(-90 100 100)"
                />
              ))}
            </svg>

            <div className="admin-pie-labels">
              {pieSegments.map((type, index) => (
                <div key={index} className="admin-pie-label">
                  <span className="admin-pie-color" style={{ background: type.color }}></span>
                  <span className="admin-pie-text">{type.name} {type.percentage}% ({type.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-dashboard-card" style={{ marginTop: '20px' }}>
          <h2>Property Types Distribution</h2>
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            No property data available
          </p>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
