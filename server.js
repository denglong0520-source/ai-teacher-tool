// 教备AI - 后端服务
// 功能：接入真实AI API，提供教案生成、出题、文档生成接口

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===== 中间件配置 =====
app.use(helmet()); // 安全头
app.use(cors()); // 跨域
app.use(express.json({ limit: '10mb' })); // 解析JSON
app.use(express.static('public')); // 静态文件

// 限流：防止API滥用
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100次请求
    message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// ===== AI API 调用函数 =====

/**
 * 调用通义千问API生成内容
 * 文档：https://help.aliyun.com/zh/model-studio/
 */
async function callQwenAPI(prompt, systemPrompt = '') {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
        throw new Error('未配置QWEN_API_KEY，请在.env文件中设置');
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'qwen-max', // 或 qwen-plus（更便宜）
            input: {
                messages: [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ]
            },
            parameters: {
                temperature: 0.7,
                top_p: 0.8,
                max_tokens: 2000
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`API调用失败: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.output.text;
}

/**
 * 调用文心一言API
 * 文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2
 */
async function callWenxinAPI(prompt) {
    const apiKey = process.env.WENXIN_API_KEY;
    const secretKey = process.env.WENXIN_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
        throw new Error('未配置文心一言API密钥');
    }

    // 1. 获取access_token
    const tokenResponse = await fetch(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
        { method: 'POST' }
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. 调用生成接口
    const response = await fetch(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${accessToken}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        }
    );

    const data = await response.json();
    return data.result;
}

/**
 * 根据配置的AI服务商选择调用方式
 */
async function callAIService(prompt, systemPrompt = '') {
    const service = process.env.AI_SERVICE || 'qwen'; // 默认通义千问
    
    switch (service) {
        case 'qwen':
            return await callQwenAPI(prompt, systemPrompt);
        case 'wenxin':
            return await callWenxinAPI(prompt);
        case 'deepseek':
            // DeepSeek API调用（成本低）
            return await callDeepSeekAPI(prompt, systemPrompt);
        default:
            throw new Error(`不支持的AI服务: ${service}`);
    }
}

/**
 * DeepSeek API调用
 */
async function callDeepSeekAPI(prompt, systemPrompt = '') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('未配置DEEPSEEK_API_KEY');

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

// ===== API路由 =====

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: '教备AI',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * 生成教案
 */
app.post('/api/generate/lesson-plan', async (req, res) => {
    try {
        const { subject, grade, textbook, topic, newCurriculum } = req.body;

        // 验证参数
        if (!subject || !grade || !textbook || !topic) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 构建Prompt
        const systemPrompt = `你是${subject}学科资深教师，精通${grade}教学内容和教学方法。
${newCurriculum ? '你必须严格遵循2022年版义务教育课程标准。' : ''}
生成的教案必须专业、详细、可直接使用。`;

        const prompt = `请为${grade}${subject}学科生成关于《${topic}》的完整教案。

教材版本：${textbook}
${newCurriculum ? '要求：严格遵循2022年版义务教育课程标准' : ''}

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
- 知识梳理：
- 拓展延伸：

### 5. 作业布置（3分钟）
（分层作业：基础题、提高题）

## 五、板书设计
（清晰的板书结构）

## 六、教学反思
（课后填写，预留空间）

---
请生成完整详细的内容，总字数不少于1500字。`;

        console.log('开始生成教案:', { subject, grade, textbook, topic });

        // 调用AI API
        const content = await callAIService(prompt, systemPrompt);

        // 返回结果
        res.json({
            success: true,
            data: {
                title: `${textbook} ${subject} ${grade} - 《${topic}》教案`,
                content: content,
                generatedAt: new Date().toISOString(),
                wordCount: content.length
            }
        });

    } catch (error) {
        console.error('生成教案失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 生成练习题
 */
app.post('/api/generate/exercises', async (req, res) => {
    try {
        const { subject, grade, knowledge, basicCount, mediumCount, advancedCount, types } = req.body;

        if (!subject || !grade || !knowledge) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const prompt = `请为${grade}${subject}学科生成练习题。

知识点：${knowledge}
题目数量：
- 基础题：${basicCount || 0}道
- 提高题：${mediumCount || 0}道
- 拓展题：${advancedCount || 0}道
题型：${types ? types.join('、') : '选择题、填空题'}

要求：
1. 题目必须符合${grade}学生的认知水平
2. 基础题考查基本概念，提高题考查应用能力，拓展题考查综合素养
3. 每道题必须包含：【题目】、【答案】、【详细解析】
4. 题目表述清晰，无歧义
5. 答案准确，解析详细

请按以下格式生成：

# ${subject}练习题

## 一、基础题（共${basicCount || 0}题）
### 第1题
**题目：** （题目内容）
**答案：** （答案）
**解析：** （详细解析，说明解题思路和知识点）

（继续生成所有基础题）

## 二、提高题（共${mediumCount || 0}题）
（格式同上）

## 三、拓展题（共${advancedCount || 0}题）
（格式同上）

---
总字数不少于2000字，确保题目质量高、有代表性。`;

        console.log('开始生成练习题:', { subject, grade, knowledge });

        const content = await callAIService(prompt);
        
        // 统计题目数量
        const totalCount = (basicCount || 0) + (mediumCount || 0) + (advancedCount || 0);

        res.json({
            success: true,
            data: {
                title: `${subject} ${grade} - 练习题`,
                content: content,
                totalCount: totalCount,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('生成练习题失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 生成行政文档
 */
app.post('/api/generate/document', async (req, res) => {
    try {
        const { docType, school, keywords, formal } = req.body;

        if (!docType || !school || !keywords) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const prompt = `请帮我生成一份专业的${docType}。

学校名称：${school}
关键信息：${keywords}
${formal ? '要求：使用正式公文格式，符合学校行政文档规范' : ''}

文档必须包含以下部分：

# ${school}
## ${docType}

### 一、基本情况
（根据关键信息撰写）

### 二、主要工作内容与成效
（详细展开，分点叙述）

### 三、亮点与创新
（突出特色工作）

### 四、存在问题
（客观分析）

### 五、改进措施与未来计划
（具体可行）

### 六、总结
（简要总结）

---
要求：
1. 语言正式、规范，符合公文写作要求
2. 内容详实，字数不少于1500字
3. 结构清晰，层次分明
4. 使用专业术语，体现教育工作特点
5. 最后附上落款：学校名称和日期（用XXXX年XX月XX日代替）

请生成完整文档内容。`;

        console.log('开始生成行政文档:', { docType, school });

        const content = await callAIService(prompt);
        
        // 添加落款
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        const fullContent = `${content}\n\n${school}\n${currentDate}`;

        res.json({
            success: true,
            data: {
                title: `${school} - ${docType}`,
                content: fullContent,
                docType: docType,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('生成行政文档失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== 错误处理 =====
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 教备AI服务启动成功！`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
    console.log('\n配置的AI服务:', process.env.AI_SERVICE || 'qwen (通义千问)');
    console.log('请确保已在.env文件中配置API密钥\n');
});

module.exports = app;