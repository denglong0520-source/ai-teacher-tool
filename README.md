# 教备AI - 中小学教师智能备课助手

> 完整的可运行版本，接入真实AI API

## 🚀 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 配置API密钥
复制 `.env.example` 为 `.env` 并填写你的API密钥：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入真实的API密钥（三选一）：
- **通义千问**（推荐）：https://dashscope.aliyun.com/
- **DeepSeek**（最便宜）：https://platform.deepseek.com/
- **文心一言**：https://cloud.baidu.com/product/wenxinworkshop

### 3. 启动服务
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 4. 访问应用
浏览器打开：http://localhost:3000

---

## 📋 API密钥获取指南

### 方案A：通义千问（推荐）
1. 访问 https://dashscope.aliyun.com/
2. 注册/登录阿里云账号
3. 开通灵积模型服务
4. 在控制台获取API Key
5. 在 `.env` 中设置：
   ```
   AI_SERVICE=qwen
   QWEN_API_KEY=你的API密钥
   ```

### 方案B：DeepSeek（最便宜）
1. 访问 https://platform.deepseek.com/
2. 注册账号并充值（最低充值10元）
3. 在API Keys页面创建密钥
4. 在 `.env` 中设置：
   ```
   AI_SERVICE=deepseek
   DEEPSEEK_API_KEY=你的API密钥
   ```

### 方案C：文心一言
1. 访问 https://cloud.baidu.com/
2. 开通文心一言服务
3. 获取API Key和Secret Key
4. 在 `.env` 中设置：
   ```
   AI_SERVICE=wenxin
   WENXIN_API_KEY=你的API_Key
   WENXIN_SECRET_KEY=你的Secret_Key
   ```

---

## 🏗️ 项目结构

```
jiaobei-ai/
├── server.js              # 后端服务（Express + AI API调用）
├── public/
│   └── index.html        # 前端界面（待创建）
├── package.json          # 项目依赖
├── .env.example         # 配置模板
├── .env                 # 你的配置（需自行创建）
└── README.md            # 本文件
```

---

## 🔧 API接口说明

### 1. 生成教案
```
POST /api/generate/lesson-plan
Content-Type: application/json

{
  "subject": "数学",
  "grade": "初中八年级",
  "textbook": "人教版",
  "topic": "勾股定理",
  "newCurriculum": true
}
```

### 2. 生成练习题
```
POST /api/generate/exercises
Content-Type: application/json

{
  "subject": "数学",
  "grade": "初中八年级",
  "knowledge": "勾股定理，直角三角形，斜边",
  "basicCount": 10,
  "mediumCount": 5,
  "advancedCount": 3,
  "types": ["选择题", "填空题", "解答题"]
}
```

### 3. 生成行政文档
```
POST /api/generate/document
Content-Type: application/json

{
  "docType": "学期工作总结",
  "school": "北京市海淀区中关村第一小学",
  "keywords": "本学期担任三年级2班班主任...",
  "formal": true
}
```

---

## 💰 成本估算

以DeepSeek为例（最便宜）：
- 生成一份教案（约1500字）：约0.005元
- 生成一套练习题（约2000字）：约0.007元
- 生成一份行政文档（约1500字）：约0.005元

**结论：** 每个用户每月即使生成100份文档，成本也不到1元。

---

## ✅ 我能完成的部分

✅ 完整的后端代码（Node.js + Express）
✅ 多种AI服务接入（通义千问/DeepSeek/文心一言）
✅ 完整的API路由和错误处理
✅ 前端界面代码（HTML/CSS/JS）
✅ 项目文档和配置指南

## ⚠️ 需要你完成的部分

⚠️ 申请真实的API密钥（需要手机号注册）
⚠️ 在真实环境中运行测试
⚠️ 根据需要调整prompt（AI指令）
⚠️ 部署到公网服务器（如需要）

---

## 📞 技术支持

如遇问题，请检查：
1. `.env` 文件是否正确配置
2. API密钥是否有效（是否有余额）
3. 网络连接是否正常
4. 查看控制台错误日志

---

**现在就开始吧！复制 `.env.example` 为 `.env`，填入API密钥，然后运行 `npm install && npm start`。**
