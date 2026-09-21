import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Mail, Lock, Loader2, Store } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [fetchingLocations, setFetchingLocations] = useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await api.get('/locations');
        setLocations(data);
        // Set default location if available
        if (data.length > 0) {
          const storedLoc = localStorage.getItem('zudo_seller_location');
          if (storedLoc && data.find(l => l.name === storedLoc)) {
            setSelectedLocation(storedLoc);
          } else {
            setSelectedLocation(data[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch locations', err);
      } finally {
        setFetchingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/sellers/login', { 
        email, 
        password,
        location: selectedLocation 
      }, {
        headers: { 'x-location': selectedLocation }
      });
      localStorage.setItem('zudo_seller_token', data.token);
      localStorage.setItem('zudo_seller_user', JSON.stringify(data));
      localStorage.setItem('zudo_seller_location', selectedLocation);
      
      if (!data.isProfileComplete) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '48px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              objectFit: 'contain',
              margin: '0 auto 24px',
              display: 'block'
            }} 
          />
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Seller Panel</h1>
          <p style={{ color: '#94a3b8' }}>Welcome back! Please login to your account.</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              className="input-field" 
              style={{ paddingLeft: '48px' }}
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field" 
              style={{ paddingLeft: '48px' }}
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Store style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} />
            <select 
              className="input-field" 
              style={{ paddingLeft: '48px', appearance: 'none' }}
              required 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={fetchingLocations}
            >
              <option value="" disabled>Select Location</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc.name}>{loc.city} ({loc.name})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '12px', height: '50px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
