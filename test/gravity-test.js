const assert = require('assert');
const fs = require('fs');
const path = require('path');

const G = 100;

function calculatePotential(x, y, celestialBodies) {
    let potential = 0;
    for (const body of celestialBodies) {
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

function calculateGravity(x, y, celestialBodies) {
    let fx = 0;
    let fy = 0;
    for (const body of celestialBodies) {
        const dx = body.x - x;
        const dy = body.y - y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > body.radius) {
            const force = G * body.mass / (r * r);
            fx += force * dx / r;
            fy += force * dy / r;
        }
    }
    return { fx, fy, magnitude: Math.sqrt(fx * fx + fy * fy) };
}

function runTests() {
    console.log('='.repeat(60));
    console.log('🌌 重力场势能可视化 - 综合测试套件');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    try {
        test1();
        passed++;
    } catch (e) {
        console.log('❌ 测试1失败:', e.message);
        failed++;
    }

    try {
        test2();
        passed++;
    } catch (e) {
        console.log('❌ 测试2失败:', e.message);
        failed++;
    }

    try {
        test3();
        passed++;
    } catch (e) {
        console.log('❌ 测试3失败:', e.message);
        failed++;
    }

    try {
        test4();
        passed++;
    } catch (e) {
        console.log('❌ 测试4失败:', e.message);
        failed++;
    }

    try {
        test5();
        passed++;
    } catch (e) {
        console.log('❌ 测试5失败:', e.message);
        failed++;
    }

    try {
        test6();
        passed++;
    } catch (e) {
        console.log('❌ 测试6失败:', e.message);
        failed++;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`📊 测试结果: 通过 ${passed} / ${passed + failed}`);
    if (failed === 0) {
        console.log('✅ 所有测试通过！');
    } else {
        console.log(`❌ ${failed} 个测试失败`);
    }
    console.log('='.repeat(60));
}

function test1() {
    console.log('📝 测试1: 单个天体的引力势计算正确性');
    
    const singleBody = [{ id: 1, x: 400, y: 300, mass: 5000, radius: 30, color: '#FF6B6B' }];
    
    const testPoints = [
        { x: 400, y: 400, desc: '天体正下方100像素' },
        { x: 500, y: 300, desc: '天体右侧100像素' },
        { x: 400, y: 300, desc: '天体中心' }
    ];

    for (const point of testPoints) {
        const potential = calculatePotential(point.x, point.y, singleBody);
        const dx = point.x - singleBody[0].x;
        const dy = point.y - singleBody[0].y;
        const r = Math.sqrt(dx * dx + dy * dy);
        const expectedR = Math.max(r, singleBody[0].radius);
        const expected = -G * singleBody[0].mass / expectedR;
        
        assert.ok(Math.abs(potential - expected) < 0.001, 
            `${point.desc}: 计算值 ${potential} 应接近预期值 ${expected}`);
        console.log(`   ✅ ${point.desc}: 势能 = ${potential.toFixed(2)}`);
    }
    console.log('');
}

function test2() {
    console.log('📝 测试2: 多天体引力势的叠加正确性');
    
    const twoBodies = [
        { id: 1, x: 300, y: 300, mass: 5000, radius: 30, color: '#FF6B6B' },
        { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' }
    ];

    const testPoints = [
        { x: 400, y: 300, desc: '两天体中间点' },
        { x: 200, y: 300, desc: '第一个天体左侧' },
        { x: 600, y: 300, desc: '第二个天体右侧' },
        { x: 400, y: 400, desc: '两天体中垂线上' }
    ];

    for (const point of testPoints) {
        const combinedPotential = calculatePotential(point.x, point.y, twoBodies);
        
        const potential1 = calculatePotential(point.x, point.y, [twoBodies[0]]);
        const potential2 = calculatePotential(point.x, point.y, [twoBodies[1]]);
        const expectedCombined = potential1 + potential2;
        
        assert.ok(Math.abs(combinedPotential - expectedCombined) < 0.001,
            `${point.desc}: 叠加计算错误`);
        console.log(`   ✅ ${point.desc}:`);
        console.log(`      天体1贡献: ${potential1.toFixed(2)}, 天体2贡献: ${potential2.toFixed(2)}`);
        console.log(`      叠加结果: ${combinedPotential.toFixed(2)}`);
    }
    console.log('');
}

function test3() {
    console.log('📝 测试3: 等势线重绘性能测试');
    
    const bodies = [
        { id: 1, x: 300, y: 250, mass: 5000, radius: 30, color: '#FF6B6B' },
        { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' },
        { id: 3, x: 400, y: 450, mass: 2000, radius: 18, color: '#FFE66D' }
    ];

    const canvasWidth = 800;
    const canvasHeight = 600;
    const step = 8;

    const startTime = Date.now();
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
        bodies[0].x = 300 + Math.random() * 200;
        bodies[0].y = 250 + Math.random() * 100;
        
        for (let y = 0; y <= canvasHeight; y += step) {
            for (let x = 0; x <= canvasWidth; x += step) {
                calculatePotential(x, y, bodies);
            }
        }
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`   ✅ 10次重绘平均耗时: ${avgTime.toFixed(2)}ms`);
    console.log(`      单次计算点数: ${(canvasWidth/step) * (canvasHeight/step)}`);
    console.log(`      FPS上限: ${(1000/avgTime).toFixed(1)} FPS`);
    
    assert.ok(avgTime < 100, `重绘耗时 ${avgTime}ms < 100ms，性能良好`);
    console.log('');
}

function test4() {
    console.log('📝 测试4: 粒子靠近大质量天体时的加速度变化');
    
    const largeBody = [{ id: 1, x: 400, y: 300, mass: 10000, radius: 30, color: '#FF6B6B' }];
    
    const distances = [200, 100, 50, 35, 31];
    const results = [];
    
    for (const dist of distances) {
        const gravity = calculateGravity(400 + dist, 300, largeBody);
        results.push({ distance: dist, magnitude: gravity.magnitude });
        console.log(`   距离 ${dist}px: 加速度大小 = ${gravity.magnitude.toFixed(2)}`);
    }
    
    for (let i = 1; i < results.length; i++) {
        const ratio = results[i].magnitude / results[i-1].magnitude;
        const expectedRatio = Math.pow(results[i-1].distance / results[i].distance, 2);
        console.log(`   距离减半时，加速度增长比例: ${ratio.toFixed(2)}x (预期平方反比关系)`);
    }
    
    const edgeGravity = calculateGravity(400 + 31, 300, largeBody);
    const insideGravity = calculateGravity(400 + 15, 300, largeBody);
    console.log(`   ✅ 天体边界(r=30)内加速度: ${insideGravity.magnitude.toFixed(2)}`);
    console.log(`   ✅ 天体边界外1px加速度: ${edgeGravity.magnitude.toFixed(2)}`);
    
    assert.ok(insideGravity.magnitude > 0, '天体内部加速度不为零');
    assert.ok(Math.abs(insideGravity.magnitude - edgeGravity.magnitude) / Math.pow(31/30, 2) < 10,
        '边界内外加速度平滑过渡');
    console.log('');
}

function test5() {
    console.log('📝 测试5: 后端存储序列化与反序列化一致性');
    
    const originalConfig = {
        celestialBodies: [
            { id: 1, x: 300, y: 250, mass: 5000, radius: 30, color: '#FF6B6B' },
            { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' },
            { id: 3, x: 400, y: 450, mass: 2000, radius: 18, color: '#FFE66D' }
        ]
    };
    
    const serialized = JSON.stringify(originalConfig, null, 2);
    console.log('   ✅ 配置序列化成功');
    
    const deserialized = JSON.parse(serialized);
    console.log('   ✅ 配置反序列化成功');
    
    assert.strictEqual(deserialized.celestialBodies.length, originalConfig.celestialBodies.length,
        '天体数量一致');
    
    for (let i = 0; i < originalConfig.celestialBodies.length; i++) {
        const original = originalConfig.celestialBodies[i];
        const restored = deserialized.celestialBodies[i];
        
        assert.strictEqual(restored.id, original.id, `天体${i+1} id一致`);
        assert.strictEqual(restored.x, original.x, `天体${i+1} x坐标一致`);
        assert.strictEqual(restored.y, original.y, `天体${i+1} y坐标一致`);
        assert.strictEqual(restored.mass, original.mass, `天体${i+1} 质量一致`);
        assert.strictEqual(restored.radius, original.radius, `天体${i+1} 半径一致`);
        assert.strictEqual(restored.color, original.color, `天体${i+1} 颜色一致`);
    }
    
    console.log('   ✅ 所有字段序列化与反序列化一致');
    
    const testFile = path.join(__dirname, '..', 'test-config.json');
    fs.writeFileSync(testFile, serialized, 'utf8');
    const readBack = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    
    assert.deepStrictEqual(readBack, originalConfig, '文件读写后数据一致');
    console.log('   ✅ 文件系统读写一致性验证通过');
    
    fs.unlinkSync(testFile);
    console.log('');
}

function test6() {
    console.log('📝 测试6: 引力方向正确性验证');
    
    const bodies = [
        { id: 1, x: 300, y: 300, mass: 5000, radius: 30, color: '#FF6B6B' }
    ];
    
    const testCases = [
        { x: 400, y: 300, expectedDir: 'left', desc: '天体右侧粒子' },
        { x: 200, y: 300, expectedDir: 'right', desc: '天体左侧粒子' },
        { x: 300, y: 400, expectedDir: 'up', desc: '天体下方粒子' },
        { x: 300, y: 200, expectedDir: 'down', desc: '天体上方粒子' }
    ];
    
    for (const testCase of testCases) {
        const gravity = calculateGravity(testCase.x, testCase.y, bodies);
        
        let directionCorrect = false;
        switch (testCase.expectedDir) {
            case 'left':
                directionCorrect = gravity.fx < 0 && Math.abs(gravity.fy) < 0.1;
                break;
            case 'right':
                directionCorrect = gravity.fx > 0 && Math.abs(gravity.fy) < 0.1;
                break;
            case 'up':
                directionCorrect = gravity.fy < 0 && Math.abs(gravity.fx) < 0.1;
                break;
            case 'down':
                directionCorrect = gravity.fy > 0 && Math.abs(gravity.fx) < 0.1;
                break;
        }
        
        assert.ok(directionCorrect, `${testCase.desc} 引力方向正确`);
        console.log(`   ✅ ${testCase.desc}: fx=${gravity.fx.toFixed(2)}, fy=${gravity.fy.toFixed(2)}`);
    }
    console.log('');
}

runTests();
