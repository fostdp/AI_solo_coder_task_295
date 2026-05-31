class GravityVisualizer {
    constructor() {
        this.canvas = document.getElementById('gravityCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.celestialBodies = [];
        this.testParticles = [];
        this.draggingBody = null;
        this.showParticles = true;
        this.nextBodyId = 4;
        
        this.init();
    }
    
    async init() {
        await this.loadConfig();
        this.createTestParticles();
        this.setupEventListeners();
        this.animate();
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            this.celestialBodies = data.celestialBodies;
            this.nextBodyId = Math.max(...this.celestialBodies.map(b => b.id)) + 1;
        } catch (e) {
            console.error('加载配置失败:', e);
            this.celestialBodies = this.getDefaultConfig();
        }
    }
    
    getDefaultConfig() {
        return [
            { id: 1, x: 300, y: 250, mass: 5000, radius: 30, color: '#FF6B6B' },
            { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' },
            { id: 3, x: 400, y: 450, mass: 2000, radius: 18, color: '#FFE66D' }
        ];
    }
    
    async saveConfig() {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ celestialBodies: this.celestialBodies })
            });
            alert('配置已保存!');
        } catch (e) {
            console.error('保存配置失败:', e);
            alert('保存失败');
        }
    }
    
    resetConfig() {
        this.celestialBodies = this.getDefaultConfig();
        this.nextBodyId = 4;
    }
    
    deleteBody(body) {
        const index = this.celestialBodies.findIndex(b => b.id === body.id);
        if (index > -1) {
            this.celestialBodies.splice(index, 1);
        }
    }
    
    createTestParticles() {
        this.testParticles = [];
        const gridSize = 40;
        for (let x = gridSize; x < this.canvas.width; x += gridSize) {
            for (let y = gridSize; y < this.canvas.height; y += gridSize) {
                this.testParticles.push({ x, y });
            }
        }
    }
    
    calculatePotential(x, y) {
        let potential = 0;
        const G = 100;
        
        for (const body of this.celestialBodies) {
            const dx = x - body.x;
            const dy = y - body.y;
            const r = Math.sqrt(dx * dx + dy * dy);
            if (r > body.radius) {
                potential -= G * body.mass / r;
            } else {
                potential -= G * body.mass / body.radius;
            }
        }
        
        return potential;
    }
    
    calculateGravity(x, y) {
        let fx = 0;
        let fy = 0;
        const G = 100;
        const MAX_FORCE = 500;
        
        for (const body of this.celestialBodies) {
            const dx = body.x - x;
            const dy = body.y - y;
            const r = Math.sqrt(dx * dx + dy * dy);
            
            const effectiveR = Math.max(r, body.radius);
            
            const force = G * body.mass / (effectiveR * effectiveR);
            const clampedForce = Math.min(force, MAX_FORCE);
            
            if (r > 0.001) {
                fx += clampedForce * dx / r;
                fy += clampedForce * dy / r;
            }
        }
        
        return { fx, fy };
    }
    
    drawEquipotentialLines() {
        const levels = [-500, -400, -300, -250, -200, -150, -100, -50, -20];
        const colors = [
            'rgba(0, 50, 100, 0.6)',
            'rgba(0, 80, 140, 0.55)',
            'rgba(0, 110, 180, 0.5)',
            'rgba(20, 140, 200, 0.45)',
            'rgba(40, 170, 220, 0.4)',
            'rgba(60, 190, 230, 0.35)',
            'rgba(100, 200, 240, 0.3)',
            'rgba(140, 220, 250, 0.25)',
            'rgba(180, 230, 255, 0.2)'
        ];
        
        const step = 12;
        const lineSkipThreshold = 2.0;
        
        const potentialGrid = [];
        for (let y = 0; y <= this.canvas.height; y += step) {
            const row = [];
            for (let x = 0; x <= this.canvas.width; x += step) {
                row.push(this.calculatePotential(x, y));
            }
            potentialGrid.push(row);
        }
        
        for (let i = 0; i < levels.length; i++) {
            this.ctx.strokeStyle = colors[i];
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            
            this.drawContour(potentialGrid, levels[i], step, lineSkipThreshold);
            
            this.ctx.stroke();
        }
    }
    
    drawContour(grid, level, step, skipThreshold) {
        let lineSegments = 0;
        const maxSegments = 3000;
        
        for (let y = 0; y < grid.length - 1; y++) {
            for (let x = 0; x < grid[y].length - 1; x++) {
                if (lineSegments > maxSegments) break;
                
                const bl = grid[y][x];
                const br = grid[y][x + 1];
                const tl = grid[y + 1][x];
                const tr = grid[y + 1][x + 1];
                
                const gradient = Math.abs(bl - br) + Math.abs(bl - tl) + Math.abs(br - tr) + Math.abs(tl - tr);
                if (gradient > skipThreshold * 4 && level < -100) continue;
                
                const caseCode = 
                    (bl < level ? 1 : 0) +
                    (br < level ? 2 : 0) +
                    (tr < level ? 4 : 0) +
                    (tl < level ? 8 : 0);
                
                if (caseCode === 0 || caseCode === 15) continue;
                
                const t = (v1, v2) => (level - v1) / (v2 - v1);
                
                const points = [];
                
                switch (caseCode) {
                    case 1: case 14:
                        points.push({ x: x * step, y: (y + t(bl, tl)) * step });
                        points.push({ x: (x + t(bl, br)) * step, y: y * step });
                        break;
                    case 2: case 13:
                        points.push({ x: (x + t(bl, br)) * step, y: y * step });
                        points.push({ x: (x + 1) * step, y: (y + t(br, tr)) * step });
                        break;
                    case 3: case 12:
                        points.push({ x: x * step, y: (y + t(bl, tl)) * step });
                        points.push({ x: (x + 1) * step, y: (y + t(br, tr)) * step });
                        break;
                    case 4: case 11:
                        points.push({ x: (x + 1) * step, y: (y + t(br, tr)) * step });
                        points.push({ x: (x + t(tl, tr)) * step, y: (y + 1) * step });
                        break;
                    case 5:
                        points.push({ x: x * step, y: (y + t(bl, tl)) * step });
                        points.push({ x: (x + t(tl, tr)) * step, y: (y + 1) * step });
                        points.push({ x: (x + t(bl, br)) * step, y: y * step });
                        points.push({ x: (x + 1) * step, y: (y + t(br, tr)) * step });
                        break;
                    case 6: case 9:
                        points.push({ x: (x + t(bl, br)) * step, y: y * step });
                        points.push({ x: (x + t(tl, tr)) * step, y: (y + 1) * step });
                        break;
                    case 7: case 8:
                        points.push({ x: x * step, y: (y + t(bl, tl)) * step });
                        points.push({ x: (x + t(tl, tr)) * step, y: (y + 1) * step });
                        break;
                    case 10:
                        points.push({ x: (x + t(bl, br)) * step, y: y * step });
                        points.push({ x: x * step, y: (y + t(bl, tl)) * step });
                        points.push({ x: (x + 1) * step, y: (y + t(br, tr)) * step });
                        points.push({ x: (x + t(tl, tr)) * step, y: (y + 1) * step });
                        break;
                }
                
                for (let j = 0; j < points.length; j += 2) {
                    if (j + 1 < points.length) {
                        this.ctx.moveTo(points[j].x, points[j].y);
                        this.ctx.lineTo(points[j + 1].x, points[j + 1].y);
                        lineSegments++;
                    }
                }
            }
        }
    }
    
    drawCelestialBodies() {
        for (const body of this.celestialBodies) {
            const gradient = this.ctx.createRadialGradient(
                body.x, body.y, 0,
                body.x, body.y, body.radius * 2
            );
            gradient.addColorStop(0, body.color);
            gradient.addColorStop(0.5, body.color + '80');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.beginPath();
            this.ctx.arc(body.x, body.y, body.radius * 2, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = body.color;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`M: ${body.mass}`, body.x, body.y + body.radius + 15);
            this.ctx.fillText(`ID: ${body.id}`, body.x, body.y - body.radius - 8);
            
            this.ctx.beginPath();
            this.ctx.arc(body.x + body.radius + 8, body.y - body.radius - 8, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            this.ctx.fill();
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText('×', body.x + body.radius + 8, body.y - body.radius - 5);
        }
    }
    
    drawTestParticles() {
        if (!this.showParticles) return;
        
        for (const particle of this.testParticles) {
            const gravity = this.calculateGravity(particle.x, particle.y);
            const magnitude = Math.sqrt(gravity.fx * gravity.fx + gravity.fy * gravity.fy);
            
            if (magnitude < 0.1) continue;
            
            const arrowLength = Math.min(25, magnitude * 0.5);
            const nx = gravity.fx / magnitude;
            const ny = gravity.fy / magnitude;
            
            const endX = particle.x + nx * arrowLength;
            const endY = particle.y + ny * arrowLength;
            
            const hue = Math.min(120, magnitude * 0.5);
            this.ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            this.ctx.lineWidth = 1.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            const headLength = 5;
            const angle = Math.atan2(ny, nx);
            this.ctx.beginPath();
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fill();
        }
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        
        document.getElementById('saveBtn').addEventListener('click', () => this.saveConfig());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetConfig());
        document.getElementById('showParticles').addEventListener('change', (e) => {
            this.showParticles = e.target.checked;
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        
        for (const body of this.celestialBodies) {
            const deleteDx = pos.x - (body.x + body.radius + 8);
            const deleteDy = pos.y - (body.y - body.radius - 8);
            const deleteDist = Math.sqrt(deleteDx * deleteDx + deleteDy * deleteDy);
            
            if (deleteDist <= 8) {
                this.deleteBody(body);
                return;
            }
            
            const dx = pos.x - body.x;
            const dy = pos.y - body.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= body.radius) {
                this.draggingBody = body;
                break;
            }
        }
    }
    
    onMouseMove(e) {
        if (!this.draggingBody) return;
        
        const pos = this.getMousePos(e);
        this.draggingBody.x = Math.max(this.draggingBody.radius, Math.min(this.canvas.width - this.draggingBody.radius, pos.x));
        this.draggingBody.y = Math.max(this.draggingBody.radius, Math.min(this.canvas.height - this.draggingBody.radius, pos.y));
    }
    
    onMouseUp() {
        this.draggingBody = null;
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawEquipotentialLines();
        this.drawTestParticles();
        this.drawCelestialBodies();
        
        requestAnimationFrame(() => this.animate());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new GravityVisualizer();
});
