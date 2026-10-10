# Learn100

用 100 个概念入门一个新领域。

小练先把一个概念讲清楚，你可以随时打断提问，然后用自己的话复述。讲完之后看四个要点盖住了几个。听过、能讲、讲透，会留在这台浏览器的地图上。100 个都点亮，就算这个领域入门了。

现在内置的领域是**健身和营养**。价值投资、学习、SEO、Web3、商业知识还在整理，设置里能看到，还不能切换。

这个用法来自亦仁：先快速搞懂一个领域的 100 个概念，听 AI 讲，自己再讲一遍。原来的通话接的是豆包。这里不填密钥也能把整圈走完。

## 本地运行

需要 Node.js 20.9 或更新版本。

```bash
npm install
npm run dev
```

打开 [http://127.0.0.1:47231](http://127.0.0.1:47231)。

- 首页选概念，或直接点绿色的「开始通话」。
- 小练讲解时，点中间的「练」可以打断提问。
- 轮到你时，可以对着麦克风讲，也可以打字。点「我讲完了」进入追问，再点一次看反馈。
- 「再讲一遍」重练这个概念，「下一个」进入后一个。
- 进度记在浏览器本地。设置里可以改每天目标和朗读，也可以清空。

没有麦克风、没有中文语音，也能学：讲解会逐句出现，复述用输入框。

## 可选：接上豆包或别的模型

复制环境变量例子：

```bash
cp .env.example .env.local
```

不填任何值，应用使用内置小练。填上之后，**讲课稿仍然是本地的**，你打断时的提问，以及复述后的反馈，会交给模型。密钥只留在服务端。

豆包（火山方舟，OpenAI 兼容）：

```bash
DOUBAO_API_KEY=你的密钥
DOUBAO_MODEL=你的接入点 ID
# 可选 DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

或者其他 OpenAI 兼容接口：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。也可以改用 `TUTOR_API_KEY`、`TUTOR_BASE_URL`、`TUTOR_MODEL`。

## 部署，并挂到 coderfather.com

最省事的是 [Vercel](https://vercel.com)。这个仓库是标准 Next.js 应用，导入后不用改构建设置。

1. 把这个仓库推到 Zack 想公开的 Git 托管（GitHub、Gitee 或其他）。本仓库的许可证是 MIT。
2. 在 Vercel 里 Import 这个仓库。Framework 选 Next.js。
3. 如果要用模型，在 Vercel 项目的 Environment Variables 里填上面的 `DOUBAO_*` 或 `OPENAI_*`。不填也能上线。
4. 部署完成后，打开项目 Settings → Domains，添加 `coderfather.com`。如果还想要 `www`，再加 `www.coderfather.com`。
5. 按 Vercel 给出的记录，到 coderfather.com 现在的 DNS 服务商改解析，不要在这里猜 IP：
   - 根域名 `coderfather.com`：按 Vercel 提示添加 `A` 记录 `76.76.21.21`，或它当时给出的 `ALIAS` / `ANAME`。
   - `www`：添加 `CNAME`，目标是 `cname.vercel-dns.com`（以 Vercel 页面上的为准）。
6. 回到 Vercel 等域名变成 Valid，证书会自动签。然后用手机打开 `https://coderfather.com` 走一遍：首页、通话、反馈、刷新后进度还在。

进度存在每个访客自己的浏览器里，不需要数据库。换浏览器或清站点数据，地图会回到 0。

也可以放到 Cloudflare Workers，但 Next.js 需要额外适配（例如 OpenNext 或 Vinext），步骤比 Vercel 多。域名同样是在托管面板里添加 `coderfather.com`，再按它给出的记录改 DNS。

## 检查

```bash
npm run lint
npm test
npm run build
```

## English

Learn100 teaches a field as 100 concepts. A tutor explains, you interrupt with questions, then you retell the idea and get a four-point coverage check. The included track is fitness and nutrition, in Chinese. Progress is stored in the browser. Voice uses the browser speech APIs, with typing as a fallback, so no API key is required. Optional Doubao or OpenAI-compatible keys upgrade follow-up questions and feedback only.

## License

MIT. See [LICENSE](LICENSE).
