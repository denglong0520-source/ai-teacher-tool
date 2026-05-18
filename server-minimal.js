// 最简版本 - 只测试基础功能
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器正常运行' });
});

// 调用通义千问API
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

// 生成教案（真实AI）
app.post('/api/generate/lesson-plan', async (req, res) => {
    try {
        const { subject, grade, textbook, topic, newCurriculum } = req.body;
        
        if (!subject || !grade || !textbook || !topic) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        console.log('开始调用AI生成教案:', { subject, grade, topic });

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

        console.log('AI生成成功，内容长度:', content.length);

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

// 生成练习题（真实AI）
app.post('/api/generate/exercise', async (req, res) => {
    try {
        const { subject, grade, topic, questionCount, questionTypes, difficulty } = req.body;
        
        if (!subject || !grade || !topic) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const count = questionCount || 10;
        const types = questionTypes || ['选择题', '填空题', '解答题'];
        const diff = difficulty || '中等';

        console.log('开始调用AI生成练习题:', { subject, grade, topic });

        const prompt = `请为${grade}${subject}学科，关于《${topic}》这个知识点，生成${count}道练习题。

要求：
1. 题目类型包括：${types.join('、')}
2. 难度等级：${diff}
3. 每道题都要有详细的解答过程和评分标准
4. 格式要清晰，便于直接打印使用

请按以下格式生成：

# 《${topic}》练习题

## 一、选择题（共${count > 3 ? Math.ceil(count/3) : 3}题，每题5分，共${count > 3 ? Math.ceil(count/3)*5 : 15}分）

**题目1：**（题目内容）
A. 选项A
B. 选项B
C. 选项C
D. 选项D
**答案：** 
**解析：**

（继续生成其他选择题）

## 二、填空题（共${count > 3 ? Math.ceil(count/3) : 3}题，每题5分，共${count > 3 ? Math.ceil(count/3)*5 : 15}分）

**题目1：**（题目内容）
**答案：** 
**解析：**

（继续生成其他填空题）

## 三、解答题（共${count > 3 ? count - 2*Math.ceil(count/3) : 4}题，共${count > 3 ? count*5 - (2*Math.ceil(count/3)*5) : 50}分）

**题目1：**（题目内容）
**解答：**
**评分标准：**
- 第一步（XX分）：
- 第二步（XX分）：
- 最终结果（XX分）：

（继续生成其他解答题）

---
请生成完整详细的题目和解答，总字数不少于2000字。`;

        const content = await callQwenAPI(prompt, `你是${subject}学科资深教师，精通${grade}教学内容。你擅长出高质量的练习题，题目要符合课程标准，难度适中，解答详细。`);

        console.log('AI生成练习题成功，内容长度:', content.length);

        res.json({
            success: true,
            data: {
                title: `${subject} ${grade} - 《${topic}》练习题`,
                content: content,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('生成失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 生成行政文档（真实AI）
app.post('/api/generate/document', async (req, res) => {
    try {
        const { docType, title, keyPoints, tone, wordCount } = req.body;
        
        if (!docType || !title) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const points = keyPoints || '';
        const docTone = tone || '正式';
        const words = wordCount || 1000;

        console.log('开始调用AI生成行政文档:', { docType, title });

        const prompt = `请生成一份专业的${docType}：《${title}》。

要求：
1. 文档类型：${docType}
2. 语气风格：${docTone}
3. 预计字数：${words}字左右
4. 必须包含以下要点（如果提供了的话）：${points}
5. 格式要规范，符合学校行政文档的标准
6. 内容要实用，可直接使用

请按以下格式生成：

# ${title}

## 基本信息
- 文档类型：${docType}
- 生成时间：${new Date().toLocaleDateString('zh-CN')}
- 适用对象：中小学教师/行政人员

## 文档正文

（根据文档类型生成合适的内容）

### ${docType}内容：

（详细内容，条理清晰，格式规范）

## 附录/补充说明

（如有需要）

---
请生成完整详细的文档内容，总字数不少于${words}字。`;

        const systemPrompt = `你是一位专业的教育行政文档撰写专家。你熟悉中小学行政工作的各种文档需求，能够撰写规范、专业、实用的行政文档。你的文档格式规范，内容详实，符合教育系统的文书要求。`;

        const content = await callQwenAPI(prompt, systemPrompt);

        console.log('AI生成行政文档成功，内容长度:', content.length);

        res.json({
            success: true,
            data: {
                title: `${docType} - ${title}`,
                content: content,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('生成失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`✅ 服务器启动成功！`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));

    const apiKey = process.env.QWEN_API_KEY;
    if (apiKey) {
        console.log('\n🤖 当前为真实AI模式（通义千问）');
        console.log(`   API密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
        console.log('   将调用真实AI生成内容\n');
    } else {
        console.log('\n⚠️  当前为模拟模式（使用模拟数据）');
        console.log('   配置真实API密钥后，将调用通义千问生成内容\n');
    }
});
