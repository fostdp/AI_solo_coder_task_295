const http = require('http');

const BASE_URL = 'http://localhost:3002';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runAPITests() {
    console.log('='.repeat(60));
    console.log('🌐 后端API测试套件');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    try {
        console.log('📝 测试1: GET /api/config - 获取配置');
        const getRes = await makeRequest('GET', '/api/config');
        console.log(`   状态码: ${getRes.status}`);
        
        if (getRes.status === 200 && getRes.data.celestialBodies) {
            console.log('   ✅ 配置获取成功');
            console.log(`      天体数量: ${getRes.data.celestialBodies.length}`);
            getRes.data.celestialBodies.forEach((body, i) => {
                console.log(`      天体${i+1}: id=${body.id}, x=${body.x}, y=${body.y}, mass=${body.mass}`);
            });
            passed++;
        } else {
            throw new Error('配置获取失败');
        }
    } catch (e) {
        console.log('❌ 测试1失败:', e.message);
        failed++;
    }
    console.log('');

    try {
        console.log('📝 测试2: POST /api/config - 保存配置');
        const testConfig = {
            celestialBodies: [
                { id: 1, x: 350, y: 280, mass: 6000, radius: 32, color: '#FF0000' },
                { id: 2, x: 520, y: 320, mass: 4000, radius: 24, color: '#00FF00' }
            ]
        };
        
        const postRes = await makeRequest('POST', '/api/config', testConfig);
        console.log(`   状态码: ${postRes.status}`);
        
        if (postRes.status === 200 && postRes.data.success) {
            console.log('   ✅ 配置保存成功');
            passed++;
        } else {
            throw new Error('配置保存失败');
        }
    } catch (e) {
        console.log('❌ 测试2失败:', e.message);
        failed++;
    }
    console.log('');

    try {
        console.log('📝 测试3: 验证保存与读取一致性');
        const testConfig2 = {
            celestialBodies: [
                { id: 999, x: 111, y: 222, mass: 7777, radius: 25, color: '#ABCDEF' }
            ]
        };
        
        await makeRequest('POST', '/api/config', testConfig2);
        const getRes = await makeRequest('GET', '/api/config');
        
        const saved = getRes.data.celestialBodies[0];
        const original = testConfig2.celestialBodies[0];
        
        let consistent = true;
        const fields = ['id', 'x', 'y', 'mass', 'radius', 'color'];
        for (const field of fields) {
            if (saved[field] !== original[field]) {
                console.log(`   ❌ 字段 ${field} 不一致: 原始=${original[field]}, 读取=${saved[field]}`);
                consistent = false;
            }
        }
        
        if (consistent) {
            console.log('   ✅ 所有字段保存与读取完全一致');
            passed++;
        } else {
            throw new Error('数据一致性验证失败');
        }
    } catch (e) {
        console.log('❌ 测试3失败:', e.message);
        failed++;
    }
    console.log('');

    try {
        console.log('📝 测试4: 恢复默认配置并验证');
        const defaultConfig = {
            celestialBodies: [
                { id: 1, x: 300, y: 250, mass: 5000, radius: 30, color: '#FF6B6B' },
                { id: 2, x: 500, y: 300, mass: 3000, radius: 22, color: '#4ECDC4' },
                { id: 3, x: 400, y: 450, mass: 2000, radius: 18, color: '#FFE66D' }
            ]
        };
        
        await makeRequest('POST', '/api/config', defaultConfig);
        const getRes = await makeRequest('GET', '/api/config');
        
        assert.deepStrictEqual(getRes.data.celestialBodies, defaultConfig.celestialBodies,
            '默认配置恢复成功');
        console.log('   ✅ 默认配置恢复并验证成功');
        passed++;
    } catch (e) {
        console.log('❌ 测试4失败:', e.message);
        failed++;
    }
    console.log('');

    console.log('='.repeat(60));
    console.log(`📊 API测试结果: 通过 ${passed} / ${passed + failed}`);
    if (failed === 0) {
        console.log('✅ 所有API测试通过！');
    } else {
        console.log(`❌ ${failed} 个测试失败`);
    }
    console.log('='.repeat(60));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

assert.deepStrictEqual = function(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || 'Objects are not equal');
    }
};

runAPITests().catch(console.error);
