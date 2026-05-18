// Vercel无服务器函数版本
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// 调用通义千问API
async function callQwenAPI(prompt, systemPrompt = '') {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
        throw new Error('未配置QWEN_API_KEY');
    }

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
        const errorText = await response.text();
        throw new Error(`API调用失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.output.text;
}

// 生成教案
app.post('/api/generate/lesson-plan', async (req, res) => {
    try {
        const { subject, grade, textbook, topic, newCurriculum } = req.body;
        
        if (!subject || !grade || !textbook || !topic) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const systemPrompt = `你是${subject}学科资深教师，精通${grade}教学内容。` +
            `${newCurriculum ? '你必须严格遵循2022年版义务教育课程标准。' : ''}` +
            '生成的教案必须专业、详细、可直接使用。';

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
（详细列出讲解步骤、互动环节、示例演示）

### 3. 课堂练习（10分钟）
（设计2-3道针对性练习）

### 4. 课堂小结（7分钟）
### 5. 作业布置（3分钟）

## 五、板书设计

## 六、教学反思
（课后填写）

---
请生成完整详细的内容，总字数不少于1500字。`;

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
        console.error('生成失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器正常运行' });
});

// 导出供Vercel使用
module.exports = app;
