// Customer Roster App - Offline PWA
// Data stored in localStorage. Photos stored as compressed base64.

const STORAGE_KEY = 'tree_customer_roster_v1';

let customers = [];
let photo1Data = null;
let photo2Data = null;

// Load on start
document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();
  renderRoster();
  setupForm();
  setupModal();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

function loadCustomers() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    customers = data ? JSON.parse(data) : [];
  } catch (e) {
    customers = [];
  }
}

function saveCustomers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (e) {
    alert('Storage full. Try removing old photos or customers.');
  }
}

function setupForm() {
  const form = document.getElementById('customer-form');
  const photo1Input = document.getElementById('photo1');
  const photo2Input = document.getElementById('photo2');

  photo1Input.addEventListener('change', (e) => handlePhoto(e, 'preview1', 1));
  photo2Input.addEventListener('change', (e) => handlePhoto(e, 'preview2', 2));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const customer = {
      id: Date.now().toString(),
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      reference: document.getElementById('reference').value.trim(),
      importance: parseInt(document.getElementById('importance').value) || 5,
      photo1: photo1Data,
      photo2: photo2Data,
      created: new Date().toISOString()
    };
    customers.push(customer);
    saveCustomers();
    renderRoster();
    form.reset();
    photo1Data = photo2Data = null;
    document.getElementById('preview1').innerHTML = '';
    document.getElementById('preview2').innerHTML = '';
  });

  document.getElementById('export-btn').addEventListener('click', exportData);
}

function handlePhoto(event, previewId, which) {
  const file = event.target.files[0];
  if (!file) return;
  compressImage(file, 800, 0.6).then(dataUrl => {
    if (which === 1) photo1Data = dataUrl;
    else photo2Data = dataUrl;
    document.getElementById(previewId).innerHTML = `<img src="${dataUrl}" alt="preview">`;
  });
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderRoster() {
  const list = document.getElementById('roster-list');
  if (customers.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">No customers yet. Add one above.</p>';
    return;
  }
  // Sort by importance ascending (1 = highest)
  const sorted = [...customers].sort((a, b) => a.importance - b.importance);
  list.innerHTML = sorted.map(c => `
    <div class="customer-card" data-id="${c.id}">
      <div class="importance-badge">${c.importance}</div>
      <div class="customer-info">
        <h3>${escapeHtml(c.name)}</h3>
        <p>📞 ${escapeHtml(c.phone)}</p>
        ${c.address ? `<p>📍 ${escapeHtml(c.address)}</p>` : ''}
        ${c.reference ? `<p>🔗 Ref: ${escapeHtml(c.reference)}</p>` : ''}
        <div class="photos">
          ${c.photo1 ? `<img src="${c.photo1}" alt="photo1">` : ''}
          ${c.photo2 ? `<img src="${c.photo2}" alt="photo2">` : ''}
        </div>
        <div class="actions">
          <button class="btn secondary" onclick="showWaiver('${c.id}')">Waiver</button>
          <button class="btn secondary" onclick="editImportance('${c.id}')">Priority</button>
          <button class="btn danger" onclick="deleteCustomer('${c.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[m]));
}

function deleteCustomer(id) {
  if (confirm('Delete this customer?')) {
    customers = customers.filter(c => c.id !== id);
    saveCustomers();
    renderRoster();
  }
}

function editImportance(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  const newVal = prompt('New importance (1 = highest priority):', c.importance);
  if (newVal && !isNaN(newVal)) {
    c.importance = parseInt(newVal);
    saveCustomers();
    renderRoster();
  }
}

function showWaiver(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  const waiverHtml = generateWaiver(c);
  document.getElementById('waiver-content').innerHTML = waiverHtml;
  document.getElementById('waiver-modal').classList.remove('hidden');
}

function generateWaiver(c) {
  const today = new Date().toLocaleDateString();
  return `
    <h2>LIABILITY WAIVER, ASSUMPTION OF RISK, AND RELEASE OF CLAIMS</h2>
    <p style="text-align:center;font-weight:bold;">Tree Pruning and Removal Services</p>
    <p><strong>Customer Name:</strong> ${escapeHtml(c.name)}</p>
    <p><strong>Customer Address:</strong> ${escapeHtml(c.address || '')}</p>
    <p><strong>Customer Phone:</strong> ${escapeHtml(c.phone)}</p>
    <p><strong>Date:</strong> ${today}</p>
    <p><strong>Service Provider:</strong> Travis Rasset (and any employees, agents, or representatives of Travis Rasset)</p>
    <hr>
    <p>By signing below, the undersigned customer acknowledges and agrees as follows:</p>
    <p><strong>1. Description of Services</strong><br>
    Customer is hiring Provider to perform tree pruning, trimming, and/or removal services on private property. Services may include cutting, climbing, use of chainsaws, chippers, trucks, or other equipment.</p>
    <p><strong>2. Acknowledgment of Risks</strong><br>
    Customer understands that tree work involves inherent risks including falling trees/limbs/debris, equipment failure, flying debris, property damage, personal injury or death, weather, uneven terrain, and other hazards.</p>
    <p><strong>3. Assumption of Risk</strong><br>
    Customer voluntarily assumes all risks of injury, death, or property damage arising from the services, including those caused by ordinary negligence of Provider.</p>
    <p><strong>4. Release of Liability</strong><br>
    To the fullest extent permitted by Minnesota law, Customer releases Travis Rasset and his employees from claims for personal injury, death, or property damage arising from the services, <strong>including ordinary negligence</strong>. This does not apply to greater-than-ordinary negligence or intentional misconduct.</p>
    <p><strong>5. Estimate Changes</strong><br>
    The original estimate may change due to unforeseen complications, hidden defects, difficult access, extended man-hours, weather, or other conditions. Final invoice may reflect actual time and conditions.</p>
    <p><strong>6. Governing Law</strong><br>
    Governed by the laws of the State of Minnesota. Severability applies.</p>
    <p style="margin-top:30px;"><strong>Customer Signature:</strong> _______________________________ &nbsp;&nbsp; <strong>Date:</strong> __________</p>
    <p><strong>Printed Name:</strong> ${escapeHtml(c.name)}</p>
    <p style="margin-top:20px;font-size:0.75rem;color:#666;">
    <em>Disclaimer: This is a sample template only and is not legal advice. Have a Minnesota attorney review before use. Minnesota law requires specific language for negligence releases.</em>
    </p>
  `;
}

function setupModal() {
  const modal = document.getElementById('waiver-modal');
  modal.querySelector('.close').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('print-waiver').addEventListener('click', () => {
    const content = document.getElementById('waiver-content').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Waiver</title><style>body{font-family:sans-serif;padding:20px;max-width:700px;margin:auto;}h2{text-align:center;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

function exportData() {
  const dataStr = JSON.stringify(customers, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customer-roster-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
