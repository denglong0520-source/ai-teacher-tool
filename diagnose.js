// 诊断脚本：检查网络和API连接
// 运行：node diagnose.js

require('dotenv').config();
const https = require('https');

console.log('='.repeat(60));
console.log('🔬 教备AI - 环境诊断工具');
console.log('='.repeat(60) + '\n');

// 测试1：检查API密钥配置
console.log('【测试1】检查API密钥配置...');
const apiKey = process.env.QWEN_API_KEY;
if (!apiKey) {
    console.error('❌ 未找到 QWEN_API_KEY');
    console.error('   请在 .env 文件中配置密钥\n');
} else {
    console.log('✅ API密钥已配置');
    console.log(`   密钥前缀：${apiKey.substring(0, 10)}...`);
    console.log(`   密钥长度：${apiKey.length} 字符\n`);
}

// 测试2：测试网络连接到阿里云API
console.log('【测试2】测试网络连接（dashscope.aliyun.com）...');

function testNetwork() {
    return new Promise((resolve, reject) => {
        const req = https.get('https://dashscope.aliyuncs.com/', (res) => {
            console.log(`✅ 网络连接正常（状态码：${res.statusCode}）\n`);
            resolve(true);
        });
        
        req.on('error', (err) => {
            console.error('❌ 网络连接失败');
            console.error(`   错误：${err.message}`);
            console.error('   可能原因：沙箱环境无法访问外部网络\n');
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.error('❌ 网络连接超时（5秒）');
            console.error('   可能原因：沙箱环境无法访问外部网络\n');
            req.destroy();
            resolve(false);
        });
    });
}

// 测试3：完整的API调用测试
async function testAPICall() {
    console.log('【测试3】完整API调用测试（30秒超时）...');
    
    if (!apiKey) {
        console.error('⏹️  跳过：未配置API密钥\n');
        return;
    }
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-max',
                input: {
                    messages: [
                        { role: 'user', content: '你好，请回复"连接成功"' }
                    ]
                },
                parameters: { temperature: 0.7, max_tokens: 50 }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        console.log(`📥 响应状态码：${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API调用失败');
            console.error(`   错误详情：${errorText}\n`);
            
            if (errorText.includes('Access denied')) {
                console.error('💡 建议：账户可能仍欠费，请访问 dashscope.aliyun.com 确认余额');
            } else if (errorText.includes('Invalid Apikey')) {
                console.error('💡 建议：API密钥无效，请重新生成');
            }
        } else {
            const data = await response.json();
            console.log('✅ API调用成功！');
            console.log(`   生成内容：${data.output.text}\n`);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ API调用超时（30秒）');
            console.error('   可能原因：沙箱环境无法访问外部网络\n');
        } else {
            console.error('❌ API调用异常');
            console.error(`   错误：${error.message}\n`);
        }
    }
}

// 主函数
async function runDiagnostics() {
    await testNetwork();
    await testAPICall();
    
    console.log('='.repeat(60));
    console.log('📋 诊断总结');
    console.log('='.repeat(60));
    console.log('1. 如果【测试2】失败 → 沙箱无法访问外网，需要在你本地运行');
    console.log('2. 如果【测试3】返回 400/401 → API密钥问题，需要重新生成');
    console.log('3. 如果【测试3】返回 200 → 成功！可以运行 npm start\n');
    console.log('💡 建议：请在你本地电脑上运行此脚本（非沙箱环境）\n');
}

runDiagnostics();