function handle(h, args) {
    var prompt = args.prompt;
    var argWidth = args.width;
    var argHeight = args.height;
    
    if (!prompt) {
        throw new Error("参数错误：缺少图像描述 'prompt'");
    }
    
    // 使用设置值或参数值或默认值
    var width = h.Settings.default_width ? parseInt(h.Settings.default_width) : (argWidth || 1024);
    var height = h.Settings.default_height ? parseInt(h.Settings.default_height) : (argHeight || 1024);
    var isPrivate = h.Settings.private === "true";
    var enhance = h.Settings.enhance === "true";
    var safe = h.Settings.safe === "true";
    
    // 手动构建查询参数
    var queryParams = [];
    queryParams.push("width=" + width);
    queryParams.push("height=" + height);
    queryParams.push("model=flux");
    queryParams.push("nologo=true");
    if (isPrivate) queryParams.push("private=true");
    if (enhance) queryParams.push("enhance=true");
    if (safe) queryParams.push("safe=true");
    
    // 构建URL
    var encodedPrompt = encodeURIComponent(prompt);
    var baseUrl = "https://image.pollinations.ai/prompt/" + encodedPrompt;
    if (queryParams.length > 0) {
        baseUrl += "?" + queryParams.join("&");
    }
    
    try {
        var testResponse = h.Http().Get(baseUrl);
        if (testResponse.StatusCode() !== 200) {
            throw new Error("无法生成图像，状态码: " + testResponse.StatusCode());
        }
        
        return "The image has been ready. You can include the image in your response by inserting ![" + prompt + "](" + baseUrl + ")";
    } catch (error) {
        throw new Error("图像生成失败: " + error.message);
    }
} 