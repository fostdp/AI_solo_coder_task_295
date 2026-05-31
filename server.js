const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONFIG_FILE = path.join(__dirname, 'celestial-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载配置失败:', e);
  }
  return getDefaultConfig();
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('保存配置失败:', e);
    return false;
  }
}

function getDefaultConfig() {
  return {
    celestialBodies: [
      { id: 1, x: 300, y: 250, mass: 5000, radius: 30, color: '#FF6B6B' },
      { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' },
      { id: 3, x: 400, y: 450, mass: 2000, radius: 18, color: '#FFE66D' }
    ]
  };
}

app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

app.post('/api/config', (req, res) => {
  const success = saveConfig(req.body);
  res.json({ success });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
