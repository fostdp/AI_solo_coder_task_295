class GravityVisualizer {
    constructor() {
        this.canvas = document.getElementById('gravityCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.celestialBodies = [];
        this.draggingBody = null;
        this.showParticles = true;

        this.equipotentialLines = [];
        this.particleData = [];
        this.isDataReady = false;

        this.worker = null;
        this.workerBusy = false;
        this.pendingUpdate = false;
        this.lastCalculateTime = 0;
        this.throttleDelay = 100;

        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;

        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.initWorker();
        this.setupEventListeners();
        this.triggerCalculate();
        this.animate();
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            this.celestialBodies = data.celestialBodies;
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
        this.triggerCalculate();
    }

    deleteBody(body) {
        const index = this.celestialBodies.findIndex(b => b.id === body.id);
        if (index > -1) {
            this.celestialBodies.splice(index, 1);
            this.triggerCalculate();
        }
    }

    async initWorker() {
        try {
            this.worker = new Worker('gravity-worker.js');

            this.worker.onmessage = (e) => {
                this.workerBusy = false;
                this.handleWorkerResult(e.data);

                if (this.pendingUpdate) {
                    this.pendingUpdate = false;
                    this.triggerCalculate();
                }
            };

            this.worker.onerror = (error) => {
                console.error('Worker错误:', error);
                this.workerBusy = false;
            };

            this.worker.postMessage({
                type: 'init',
                width: this.canvas.width,
                height: this.canvas.height,
                bodies: this.celestialBodies
            });
        } catch (e) {
            console.error('初始化Worker失败:', e);
        }
    }

    handleWorkerResult(data) {
        switch (data.type) {
            case 'init_complete':
                console.log('Worker初始化完成');
                break;

            case 'full_result':
                this.equipotentialLines = data.equipotentialLines;
                this.particleData = data.particleData;
                this.isDataReady = true;
                break;
        }
    }

    triggerCalculate() {
        const now = Date.now();

        if (this.workerBusy) {
            this.pendingUpdate = true;
            return;
        }

        if (now - this.lastCalculateTime < this.throttleDelay && this.isDataReady) {
            return;
        }

        if (this.worker) {
            this.workerBusy = true;
            this.lastCalculateTime = now;
            this.worker.postMessage({
                type: 'update_bodies',
                bodies: this.celestialBodies
            });
            this.worker.postMessage({
                type: 'calculate_full'
            });
        }
    }

    drawEquipotentialLines() {
        if (!this.isDataReady || !this.equipotentialLines) return;

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

        for (const lineData of this.equipotentialLines) {
            this.ctx.strokeStyle = colors[lineData.colorIndex % colors.length];
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();

            for (const segment of lineData.segments) {
                this.ctx.moveTo(segment.x1, segment.y1);
                this.ctx.lineTo(segment.x2, segment.y2);
            }

            this.ctx.stroke();
        }
    }

    drawTestParticles() {
        if (!this.showParticles || !this.isDataReady || !this.particleData) return;

        for (const particle of this.particleData) {
            const magnitude = Math.sqrt(particle.fx * particle.fx + particle.fy * particle.fy);

            if (magnitude < 0.1) continue;

            const arrowLength = Math.min(25, magnitude * 0.5);
            const nx = particle.fx / magnitude;
            const ny = particle.fy / magnitude;

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

    drawFPS() {
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`FPS: ${this.currentFps}`, 10, 25);
        this.ctx.fillText(`Worker: ${this.workerBusy ? '计算中' : '空闲'}`, 10, 45);
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

        this.triggerCalculate();
    }

    onMouseUp() {
        this.draggingBody = null;
        this.triggerCalculate();
    }

    animate() {
        const now = performance.now();

        this.fpsCounter++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFpsUpdate = now;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawEquipotentialLines();
        this.drawTestParticles();
        this.drawCelestialBodies();
        this.drawFPS();

        requestAnimationFrame(() => this.animate());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new GravityVisualizer();
});
