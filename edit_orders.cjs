const fs = require('fs');
const file = 'd:/Office Projects/Zudo-seller panel/src/pages/Orders.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace(
  `import api, { IMAGE_BASE_URL, getImageUrl } from '../utils/api';`,
  `import api, { uploadApi, IMAGE_BASE_URL, getImageUrl } from '../utils/api';`
);

content = content.replace(
  `} from 'lucide-react';`,
  `, Upload, QrCode, Loader2 } from 'lucide-react';`
);

// 2. Add handleQrUpload function inside OrderDetailPanel
const addFn = `
  const OrderDetailPanel = ({ order, onClose }) => {
    const [uploadingQr, setUploadingQr] = useState(false);
    const [qrCodeDoc, setQrCodeDoc] = useState(order.qrCodeDoc || '');
    const [qrOption, setQrOption] = useState(order.qrOption || '');

    const handleQrUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploadingQr(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      try {
        const { data } = await uploadApi.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fullUrl = \`\${IMAGE_BASE_URL}\${data.url}\`;
        setQrCodeDoc(fullUrl);
        await api.put(\`/orders/\${order._id}/qrcode\`, { qrCodeDoc: fullUrl, qrOption });
        // Update local state
        order.qrCodeDoc = fullUrl;
        order.qrOption = qrOption;
        alert('QR Code saved for this order!');
      } catch (err) {
        console.error('QR upload error:', err);
        alert('Failed to upload QR');
      } finally {
        setUploadingQr(false);
      }
    };
    
    const handleSaveQrOption = async () => {
      try {
        await api.put(\`/orders/\${order._id}/qrcode\`, { qrCodeDoc, qrOption });
        order.qrCodeDoc = qrCodeDoc;
        order.qrOption = qrOption;
        alert('QR Option saved!');
      } catch(e) {
        alert('Failed to save QR option');
      }
    };

    if (!order) return null;`;

content = content.replace(
  `  const OrderDetailPanel = ({ order, onClose }) => {\n    if (!order) return null;`,
  addFn
);

// 3. Add QR Code section below Items Summary in OrderDetailPanel
const qrSection = `        {/* Order Items */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Items Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <img
                  src={getImageUrl(item.image)}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={(e) => e.target.src = 'https://placehold.co/48'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Qty: {item.quantity} × ₹{item.netPrice !== undefined ? item.netPrice : item.price}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  ₹{item.netTotal !== undefined ? item.netTotal : (item.quantity * item.price)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code Upload Section */}
        <div style={{ marginBottom: '32px', padding: '24px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><QrCode size={18} color="#6366f1" /> Assign Payment QR to Order</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              position: 'relative',
              height: '100px',
              border: '2px dashed rgba(99, 102, 241, 0.3)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: qrCodeDoc ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }} onClick={() => document.getElementById('qrCodeUpload').click()}>
              <input type="file" id="qrCodeUpload" hidden onChange={handleQrUpload} accept=".jpg,.jpeg,.png,.pdf" />
              {uploadingQr ? (
                <Loader2 className="animate-spin" size={24} color="#6366f1" />
              ) : qrCodeDoc ? (
                <>
                  <div style={{ color: '#22c55e', marginBottom: '8px' }}><CheckCircle size={24} /></div>
                  <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>QR Code Assigned</div>
                </>
              ) : (
                <>
                  <div style={{ color: '#6366f1', marginBottom: '8px' }}><Upload size={24} /></div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Click to upload QR Code</div>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="QR Option / UPI ID (e.g. 9876543210@upi)" 
                value={qrOption}
                onChange={e => setQrOption(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <button 
                onClick={handleSaveQrOption}
                style={{ padding: '0 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>`;

content = content.replace(
  `        {/* Order Items */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Items Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <img
                  src={getImageUrl(item.image)}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={(e) => e.target.src = 'https://placehold.co/48'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Qty: {item.quantity} × ₹{item.netPrice !== undefined ? item.netPrice : item.price}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  ₹{item.netTotal !== undefined ? item.netTotal : (item.quantity * item.price)}
                </div>
              </div>
            ))}
          </div>
        </div>`,
  qrSection
);

fs.writeFileSync(file, content);
console.log('Updated Orders.jsx');
