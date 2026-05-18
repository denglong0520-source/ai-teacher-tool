// 教备AI - 后端服务（修正版）
// 使用Node.js内置fetch，无需node-fetch依赖

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件
app.use(express.static('public'));

// 限流
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// ===== AI调用函数（使用原生fetch）=====

async function callQwenAPI(prompt, systemPrompt = '') {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) throw new Error('未配置QWEN_API_KEY');

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
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ]
            },
            parameters: { temperature: 0.7, max_tokens: 2000 }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API调用失败: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.output.text;
}

// ===== API路由 =====

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: '教备AI',
        version: '1.0.0',
        ai_service: process.env.AI_SERVICE || 'qwen',
        timestamp: new Date().toISOString()
    });
});

// 生成教案
app.post('/api/generate/lesson-plan', async (req, res) => {
    try {
        const { subject, grade, textbook, topic, newCurriculum } = req.body;

        if (!subject || !grade || !textbook || !topic) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const systemPrompt = `你是${subject}学科资深教师，精通${grade}教学内容。${newCurriculum ? '必须严格遵循2022年版义务教育课程标准。' : ''}生成的教案必须专业、详细、可直接使用。`;

        const prompt = `请为${grade}${subject}学科生成关于《${topic}》的完整教案。

教材版本：${textbook}

教案必须包含以下部分（请严格按照格式生成）：

# 《${topic}》教案

## 一、教学目标
1. 知识与技能：
2. 过程与方法：
3. 情感态度与价值观：

## 二、教学重难点
- 教学重点：
- 教学难点：

## 三、教学准备
（列出所需教具、多媒体资源等）

## 四、教学过程（45分钟）
### 1. 导入新课（5分钟）
- 教师活动：
- 学生活动：
- 设计意图：

### 2. 新课讲授（20分钟）
（详细列出讲解步骤）

### 3. 课堂练习（10分钟）
（设计2-3道针对性练习）

### 4. 课堂小结（7分钟）
### 5. 作业布置（3分钟）

## 五、板书设计

## 六、教学反思
（课后填写）

---
请生成完整详细的内容，总字数不少于1500字。`;

        console.log('开始生成教案:', topic);
        const content = await callQwenAPI(prompt, systemPrompt);

        res.json({
            success: true,
            data: {
                title: `${textbook} ${subject} ${grade} - 《${topic}》教案`,
                content: content,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('生成教案失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 教备AI服务启动成功！`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
    console.log('\n配置的AI服务:', process.env.AI_SERVICE || 'qwen (通义千问)');
    console.log('API密钥前缀:', process.env.QWEN_API_KEY ? process.env.QWEN_API_KEY.substring(0, 10) + '...' : '未配置');
    console.log('\n💡 现在可以访问 http://localhost:' + PORT + ' 使用应用\n');
});

module.exports = app;