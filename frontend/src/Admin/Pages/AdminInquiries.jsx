import React, { useState, useEffect } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../style/AdminInquiries.css';

const AdminInquiries = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [agentBuilderFilter, setAgentBuilderFilter] = useState('');
  const [inquiries, setInquiries] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ properties: [], agents_builders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [propertyFilter, agentBuilderFilter, searchTerm, pageSize]);

  useEffect(() => {
    fetchInquiries();
  }, [pagination.page, propertyFilter, agentBuilderFilter, searchTerm]);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });

      if (propertyFilter) {
        params.append('property_id', propertyFilter);
      }

      if (agentBuilderFilter) {
        params.append('agent_builder_id', agentBuilderFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_INQUIRIES_LIST}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setInquiries(data.data.inquiries || []);
        setPagination(data.data.pagination || { page: 1, total: 0, pages: 0 });
        if (data.data.filter_options) {
          setFilterOptions(data.data.filter_options);
        }
      } else {
        setError(data.message || 'Failed to load inquiries');
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = (inquiry) => {
    setSelectedInquiry(inquiry);
    setShowMessageModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': '#3b82f6',
      'contacted': '#8b5cf6',
      'viewed': '#06b6d4',
      'interested': '#10b981',
      'not_interested': '#f59e0b',
      'closed': '#64748b'
    };
    return colors[status] || '#64748b';
  };

  return (
    <div className="admin-inquiries">
      <div className="admin-page-header">
        <div>
          <h1>Inquiry Management</h1>
          <p>{loading ? 'Loading...' : `${inquiries.length} of ${pagination.total} inquiries`}</p>
        </div>
      </div>

      <div className="admin-filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: '#64748b' }}>Items per page:</label>
          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        <div className="admin-search-box">
          <div className="admin-search-input-wrapper">
            <Search />
            <input
              type="text"
              placeholder="Search by name, email, mobile, or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchInquiries();
                }
              }}
            />
          </div>
          <button className="admin-search-btn" onClick={fetchInquiries}>
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Property Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">All Properties</option>
            {filterOptions.properties.map(prop => (
              <option key={prop.id} value={prop.id}>{prop.title}</option>
            ))}
          </select>

          {/* Agent/Builder Filter */}
          <select
            value={agentBuilderFilter}
            onChange={(e) => setAgentBuilderFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">All Agents/Builders</option>
            {filterOptions.agents_builders.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name} ({agent.user_type === 'agent' ? 'Agent' : 'Builder'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#fee2e2', 
          color: '#dc2626', 
          padding: '12px 16px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="admin-inquiries-table-container">
        {loading ? (
          <div className="admin-no-results">
            <h3>Loading inquiries...</h3>
            <p>Please wait while we fetch inquiry data...</p>
          </div>
        ) : error && inquiries.length === 0 ? (
          <div className="admin-no-results">
            <h3>Unable to Load Inquiries</h3>
            <p>{error}</p>
            <button 
              onClick={fetchInquiries}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : inquiries.length > 0 ? (
          <>
            <div style={{ marginBottom: '15px', color: '#64748b', fontSize: '14px' }}>
              Showing {inquiries.length} of {pagination.total} inquiries (Page {pagination.page} of {pagination.pages})
            </div>
            <table className="admin-inquiries-table">
              <thead>
                <tr>
                  <th>INQUIRY ID</th>
                  <th>USER</th>
                  <th>PROPERTY</th>
                  <th>OWNER (Agent/Builder)</th>
                  <th>DATE & TIME</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td>#{inquiry.id}</td>
                    <td>
                      <div className="admin-inquiry-user-cell">
                        <div className="admin-inquiry-user-name">{inquiry.buyer_name}</div>
                        <div className="admin-inquiry-user-details">
                          {inquiry.buyer_mobile}
                        </div>
                        <div className="admin-inquiry-user-email">{inquiry.buyer_email}</div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-inquiry-property-cell">
                        <div className="admin-inquiry-property-title">{inquiry.property_title}</div>
                        <div className="admin-inquiry-property-details">
                          {inquiry.property_location} • {formatPrice(inquiry.property_price)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Property ID: #{inquiry.property_id}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-inquiry-owner-cell">
                        <div className="admin-inquiry-owner-name">{inquiry.seller_name}</div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#06b6d4',
                          marginTop: '2px'
                        }}>
                          {inquiry.seller_type === 'agent' ? 'Agent' : 'Builder'}
                        </div>
                        <div className="admin-inquiry-owner-email">{inquiry.seller_phone}</div>
                      </div>
                    </td>
                    <td className="admin-inquiry-date-cell">{formatDate(inquiry.created_at)}</td>
                    <td>
                      <span
                        className="admin-status-badge"
                        style={{
                          background: `${getStatusColor(inquiry.status)}20`,
                          color: getStatusColor(inquiry.status),
                          textTransform: 'capitalize'
                        }}
                      >
                        {inquiry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="admin-actions-column">
                      <button
                        className="admin-icon-btn admin-info"
                        title="View Message"
                        onClick={() => handleViewMessage(inquiry)}
                      >
                        <MessageSquare />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="admin-pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  style={{ 
                    padding: '8px 16px', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px',
                    background: pagination.page === 1 ? '#f1f5f9' : 'white',
                    cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0 10px' }}>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total inquiries)
                </span>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  style={{ 
                    padding: '8px 16px', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px',
                    background: pagination.page === pagination.pages ? '#f1f5f9' : 'white',
                    cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="admin-no-results">
            <h3>No inquiries found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedInquiry && (
        <div className="admin-modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Inquiry Message</h2>
              <button 
                className="admin-modal-close"
                onClick={() => setShowMessageModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>From:</strong> {selectedInquiry.buyer_name} ({selectedInquiry.buyer_email})
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Property:</strong> {selectedInquiry.property_title}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Message:</strong>
                <div style={{ 
                  marginTop: '10px', 
                  padding: '15px', 
                  background: '#f8fafc', 
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {selectedInquiry.message || 'No message provided'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <strong>Inquiry Date:</strong> {formatDate(selectedInquiry.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiries;

