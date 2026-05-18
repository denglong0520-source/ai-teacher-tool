// 测试通义千问API连接
// 运行：node test-api.js

require('dotenv').config();

const QWEN_API_KEY = process.env.QWEN_API_KEY;
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

console.log('='.repeat(60));
console.log('📡 教备AI - 通义千问API连接测试');
console.log('='.repeat(60));

if (!QWEN_API_KEY) {
    console.error('❌ 错误：未找到 QWEN_API_KEY');
    console.error('请确保在 .env 文件中配置了正确的API密钥');
    process.exit(1);
}

console.log('✓ API密钥已加载');
console.log('✓ 端点：', API_URL);
console.log('⏳ 正在发送测试请求...\n');

// 测试调用
async function testAPI() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${QWEN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-max',
                input: {
                    messages: [
                        { role: 'system', content: '你是一位资深中小学数学教师。' },
                        { role: 'user', content: '请为初中八年级生成关于"勾股定理"的教案大纲，包含教学目标、重难点和教学过程三个部分。' }
                    ]
                },
                parameters: {
                    temperature: 0.7,
                    max_tokens: 1000
                }
            })
        });

        console.log('📥 响应状态码：', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        
        console.log('\n✅ API调用成功！\n');
        console.log('='.repeat(60));
        console.log('📝 AI生成内容：');
        console.log('='.repeat(60));
        console.log(data.output.text);
        console.log('\n' + '='.repeat(60));
        console.log('📊 使用统计：');
        console.log('  输入Token：', data.usage.input_tokens);
        console.log('  输出Token：', data.usage.output_tokens);
        console.log('  总成本：约', (data.usage.input_tokens + data.usage.output_tokens) * 0.00004, '元');
        console.log('='.repeat(60));
        
        console.log('\n🎉 测试通过！你的API已正确配置。');
        console.log('现在可以运行：npm start  来启动完整服务。\n');
        
    } catch (error) {
        console.error('\n❌ API调用失败：');
        console.error('  错误信息：', error.message);
        console.error('\n可能的原因：');
        console.error('  1. API密钥错误（请检查 .env 文件）');
        console.error('  2. 账户余额不足（请访问 dashscope.aliyun.com 充值）');
        console.error('  3. 网络问题（检查网络连接）');
        console.error('  4. API端点错误（检查 model 参数）\n');
        process.exit(1);
    }
}

testAPI();