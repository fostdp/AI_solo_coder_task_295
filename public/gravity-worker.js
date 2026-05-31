class GravityWorker {
    constructor() {
        this.G = 100;
        this.celestialBodies = [];
        this.width = 800;
        this.height = 600;
        this.step = 12;
        this.isCalculating = false;
        this.pendingRequest = null;
    }

    setBodies(bodies) {
        this.celestialBodies = bodies;
    }

    setDimensions(width, height) {
        this.width = width;
        this.height = height;
    }

    calculatePotential(x, y) {
        let potential = 0;
        for (const body of this.celestialBodies) {
            const dx = x - body.x;
            const dy = y - body.y;
            const r = Math.sqrt(dx * dx + dy * dy);
            if (r > body.radius) {
                potential -= this.G * body.mass / r;
            } else {
                potential -= this.G * body.mass / body.radius;
            }
        }
        return potential;
    }

    calculateGravity(x, y) {
        let fx = 0;
        let fy = 0;
        const MAX_FORCE = 500;

        for (const body of this.celestialBodies) {
            const dx = body.x - x;
            const dy = body.y - y;
            const r = Math.sqrt(dx * dx + dy * dy);
            const effectiveR = Math.max(r, body.radius);
            const force = this.G * body.mass / (effectiveR * effectiveR);
            const clampedForce = Math.min(force, MAX_FORCE);

            if (r > 0.001) {
                fx += clampedForce * dx / r;
                fy += clampedForce * dy / r;
            }
        }

        return { fx, fy };
    }

    generatePotentialGrid() {
        const cols = Math.ceil(this.width / this.step) + 1;
        const rows = Math.ceil(this.height / this.step) + 1;
        const grid = new Float32Array(cols * rows);

        let index = 0;
        for (let y = 0; y <= this.height; y += this.step) {
            for (let x = 0; x <= this.width; x += this.step) {
                grid[index++] = this.calculatePotential(x, y);
            }
        }

        return {
            grid,
            cols,
            rows,
            step: this.step,
            width: this.width,
            height: this.height
        };
    }

    generateParticleData() {
        const particles = [];
        const gridSize = 40;

        for (let x = gridSize; x < this.width; x += gridSize) {
            for (let y = gridSize; y < this.height; y += gridSize) {
                const gravity = this.calculateGravity(x, y);
                particles.push({
                    x,
                    y,
                    fx: gravity.fx,
                    fy: gravity.fy
                });
            }
        }

        return particles;
    }

    calculateEquipotentialLines(gridData) {
        const levels = [-500, -400, -300, -250, -200, -150, -100, -50, -20];
        const allSegments = [];
        const maxSegmentsPerLevel = 500;

        for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
            const level = levels[levelIndex];
            const segments = this.traceContour(gridData, level, maxSegmentsPerLevel);
            allSegments.push({
                level,
                segments,
                colorIndex: levelIndex
            });
        }

        return allSegments;
    }

    traceContour(gridData, level, maxSegments) {
        const { grid, cols, rows, step } = gridData;
        const segments = [];
        let segmentCount = 0;

        for (let y = 0; y < rows - 1 && segmentCount < maxSegments; y++) {
            for (let x = 0; x < cols - 1 && segmentCount < maxSegments; x++) {
                const idx = y * cols + x;
                const bl = grid[idx];
                const br = grid[idx + 1];
                const tl = grid[idx + cols];
                const tr = grid[idx + cols + 1];

                const caseCode =
                    (bl < level ? 1 : 0) +
                    (br < level ? 2 : 0) +
                    (tr < level ? 4 : 0) +
                    (tl < level ? 8 : 0);

                if (caseCode === 0 || caseCode === 15) continue;

                const intersectX = (vx, vy) => {
                    const t = (level - bl) / (br - bl);
                    if (Math.abs(br - bl) < 0.001) return -1;
                    return step * t;
                };

                const intersectY = (v1, v2) => {
                    const t = (level - v1) / (v2 - v1);
                    if (Math.abs(v2 - v1) < 0.001) return -1;
                    return step * t;
                };

                const points = [];
                const px = x * step;
                const py = y * step;

                switch (caseCode) {
                    case 1: case 14: {
                        const t1 = intersectY(bl, tl);
                        const t2 = intersectX(bl, br);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px, y: py + t1 }, { x: px + t2, y: py });
                        }
                        break;
                    }
                    case 2: case 13: {
                        const t1 = intersectX(bl, br);
                        const t2 = intersectY(br, tr);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px + t1, y: py }, { x: px + step, y: py + t2 });
                        }
                        break;
                    }
                    case 3: case 12: {
                        const t1 = intersectY(bl, tl);
                        const t2 = intersectY(br, tr);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px, y: py + t1 }, { x: px + step, y: py + t2 });
                        }
                        break;
                    }
                    case 4: case 11: {
                        const t1 = intersectY(br, tr);
                        const t2 = intersectY(tl, tr);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px + step, y: py + t1 }, { x: px + t2, y: py + step });
                        }
                        break;
                    }
                    case 5: {
                        const t1 = intersectY(bl, tl);
                        const t2 = intersectY(tl, tr);
                        const t3 = intersectX(bl, br);
                        const t4 = intersectY(br, tr);
                        if (t1 >= 0 && t2 >= 0 && t3 >= 0 && t4 >= 0) {
                            points.push({ x: px, y: py + t1 }, { x: px + t2, y: py + step });
                            points.push({ x: px + t3, y: py }, { x: px + step, y: py + t4 });
                        }
                        break;
                    }
                    case 6: case 9: {
                        const t1 = intersectX(bl, br);
                        const t2 = intersectY(tl, tr);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px + t1, y: py }, { x: px + t2, y: py + step });
                        }
                        break;
                    }
                    case 7: case 8: {
                        const t1 = intersectY(bl, tl);
                        const t2 = intersectY(tl, tr);
                        if (t1 >= 0 && t2 >= 0) {
                            points.push({ x: px, y: py + t1 }, { x: px + t2, y: py + step });
                        }
                        break;
                    }
                    case 10: {
                        const t1 = intersectX(bl, br);
                        const t2 = intersectY(bl, tl);
                        const t3 = intersectY(br, tr);
                        const t4 = intersectY(tl, tr);
                        if (t1 >= 0 && t2 >= 0 && t3 >= 0 && t4 >= 0) {
                            points.push({ x: px + t1, y: py }, { x: px, y: py + t2 });
                            points.push({ x: px + step, y: py + t3 }, { x: px + t4, y: py + step });
                        }
                        break;
                    }
                }

                for (let i = 0; i < points.length; i += 2) {
                    if (i + 1 < points.length && segmentCount < maxSegments) {
                        segments.push({
                            x1: points[i].x,
                            y1: points[i].y,
                            x2: points[i + 1].x,
                            y2: points[i + 1].y
                        });
                        segmentCount++;
                    }
                }
            }
        }

        return segments;
    }

    processRequest(data) {
        switch (data.type) {
            case 'init':
                this.setDimensions(data.width, data.height);
                this.setBodies(data.bodies);
                return { type: 'init_complete' };

            case 'update_bodies':
                this.setBodies(data.bodies);
                break;

            case 'calculate_full':
                const gridData = this.generatePotentialGrid();
                const equipotentialLines = this.calculateEquipotentialLines(gridData);
                const particleData = this.generateParticleData();
                return {
                    type: 'full_result',
                    equipotentialLines,
                    particleData,
                    timestamp: Date.now()
                };

            case 'calculate_potential_only':
                const grid = this.generatePotentialGrid();
                return {
                    type: 'potential_result',
                    gridData: grid,
                    timestamp: Date.now()
                };

            case 'calculate_particles_only':
                const particles = this.generateParticleData();
                return {
                    type: 'particle_result',
                    particleData: particles,
                    timestamp: Date.now()
                };
        }
    }
}

const worker = new GravityWorker();

self.onmessage = function(e) {
    const result = worker.processRequest(e.data);
    if (result) {
        self.postMessage(result);
    }
};
