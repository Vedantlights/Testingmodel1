import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../style/AdminAgents.css';

const AdminAgents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    // Reset to page 1 when search or page size changes
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm, pageSize]);

  useEffect(() => {
    fetchAgents();
  }, [pagination.page, searchTerm]);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_AGENTS_LIST}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Use HTTP-only cookie for authentication
      });

      const data = await response.json();

      if (data.success) {
        setAgents(data.data.agents || []);
        setPagination(data.data.pagination || { page: 1, total: 0, pages: 0 });
      } else {
        setError(data.message || 'Failed to load agents');
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (agentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_AGENTS_VERIFY}?id=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Use HTTP-only cookie for authentication
      });

      const data = await response.json();

      if (data.success) {
        fetchAgents();
      } else {
        alert(data.message || 'Failed to verify agent');
      }
    } catch (err) {
      console.error('Error verifying agent:', err);
      alert('Failed to verify agent');
    }
  };

  const handleUnverify = async (agentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_AGENTS_UNVERIFY}?id=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Use HTTP-only cookie for authentication
      });

      const data = await response.json();

      if (data.success) {
        fetchAgents();
      } else {
        alert(data.message || 'Failed to unverify agent');
      }
    } catch (err) {
      console.error('Error unverifying agent:', err);
      alert('Failed to unverify agent');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="admin-agents">
      <div className="admin-page-header">
        <div>
          <h1>Manage Agents & Builders</h1>
          <p>{loading ? 'Loading...' : `${agents.length} of ${pagination.total} agents`}</p>
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
          <Search className="admin-search-icon" />
          <input 
            type="text" 
            placeholder="Search agents..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchAgents();
              }
            }}
          />
          <button className="admin-search-btn" onClick={fetchAgents}>
            Search
          </button>
        </div>
      </div>

      <div className="admin-agents-table-container">
        {loading ? (
          <div className="admin-no-results">
            <h3>Loading agents...</h3>
          </div>
        ) : error ? (
          <div className="admin-no-results">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : agents.length > 0 ? (
          <table className="admin-agents-table">
            <thead>
              <tr>
                <th>AGENT</th>
                <th>STATUS</th>
                <th>LEADS</th>
                <th>PROPERTIES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const isVerified = agent.agent_verified || false;
                return (
                  <tr key={agent.id}>
                    <td data-label="Agent">
                      <div className="admin-agent-cell">
                        <div className="admin-agent-avatar">
                          {getInitials(agent.full_name)}
                        </div>
                        <div>
                          <div className="admin-agent-name">{agent.full_name || 'N/A'}</div>
                          <div className="admin-agent-email">{agent.email}</div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Type">
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        background: '#06b6d420',
                        color: '#06b6d4',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Agent/Builder
                      </span>
                    </td>

                    <td data-label="Status">
                      <span className={`admin-status-badge ${isVerified ? 'admin-verified' : 'admin-pending'}`}>
                        {isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>

                    <td data-label="Leads">
                      <div className="admin-leads-badge">{agent.leads_count || 0}</div>
                    </td>

                    <td data-label="Properties">
                      <div className="admin-leads-badge">{agent.property_count || 0}</div>
                    </td>

                    <td data-label="Actions" className="admin-actions-cell">
                      <div className="admin-actions-wrapper">
                        {isVerified ? (
                          <button 
                            className="admin-agent-action-btn admin-agent-unverify-btn" 
                            title="Unverify Agent"
                            onClick={() => handleUnverify(agent.id)}
                          >
                            <XCircle size={18} />
                            <span>Unverify</span>
                          </button>
                        ) : (
                          <button 
                            className="admin-agent-action-btn admin-agent-verify-btn" 
                            title="Verify Agent"
                            onClick={() => handleVerify(agent.id)}
                          >
                            <CheckCircle size={18} />
                            <span>Verify</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="admin-no-results">
            <h3>No agents found</h3>
            <p>Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAgents;
