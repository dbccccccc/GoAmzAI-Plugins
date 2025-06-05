function handle(h, args) {
    let { query, language, topic, days, country, chunks_per_source, include_images, include_image_descriptions } = args;

    if (!query) {
        throw new Error("参数错误：缺少搜索关键词 'query'");
    }

    // 检查查询字符串的长度，如果小于5个字符，则在前面添加"contents about "
    if (query.length < 5) {
        query = "contents about " + query;
    }

    const apiKey = h.Settings.api_key;
    if (!apiKey) {
        throw new Error("插件配置错误：缺少 API 密钥");
    }

    // 使用设置作为默认值，但允许函数参数覆盖
    const searchDepth = h.Settings.search_depth || "basic";
    const maxResults = parseInt(h.Settings.max_results) || 5;
    const chunksPerSource = chunks_per_source || parseInt(h.Settings.chunks_per_source) || 3;
    const includeAnswer = h.Settings.include_answer === "true";
    const includeRawContent = h.Settings.include_raw_content === "true";
    const defaultLanguage = h.Settings.language || "en";
    const defaultTopic = h.Settings.topic || "general";

    // 处理图片包含策略
    const imageStrategy = h.Settings.include_images || "auto";
    const includeImages = imageStrategy === "always" || (imageStrategy === "auto" && include_images === true);
    const includeImageDescriptions = include_image_descriptions !== undefined ? include_image_descriptions : (h.Settings.include_image_descriptions === "true");

    // 处理域名列表
    let includeDomains = [];
    let excludeDomains = [];

    if (h.Settings.include_domains) {
        includeDomains = h.Settings.include_domains.split(',').map(domain => domain.trim()).filter(domain => domain);
    }
    if (h.Settings.exclude_domains) {
        excludeDomains = h.Settings.exclude_domains.split(',').map(domain => domain.trim()).filter(domain => domain);
    }

    // 构建搜索请求体
    const searchRequestBody = {
        query: query,
        search_depth: searchDepth,
        max_results: maxResults,
        chunks_per_source: chunksPerSource,
        include_answer: includeAnswer,
        include_raw_content: includeRawContent,
        include_images: includeImages,
        include_image_descriptions: includeImageDescriptions,
        language: language || defaultLanguage
    };

    // 添加可选参数
    if (topic || defaultTopic !== "general") {
        searchRequestBody.topic = topic || defaultTopic;
    }
    if (days) {
        searchRequestBody.days = days;
    }
    if (country) {
        searchRequestBody.country = country;
    }
    if (includeDomains.length > 0) {
        searchRequestBody.include_domains = includeDomains;
    }
    if (excludeDomains.length > 0) {
        searchRequestBody.exclude_domains = excludeDomains;
    }

    // 搜索请求
    const http = h.Http()
        .SetHeader("Content-Type", "application/json")
        .SetHeader("Authorization", `Bearer ${apiKey}`)
        .SetBody(JSON.stringify(searchRequestBody));

    try {
        const searchResp = http.Post("https://api.tavily.com/search");

        if (searchResp.StatusCode() !== 200) {
            const errorBody = h.ToString(searchResp.Body());
            let errorMessage = "搜索请求失败";
            try {
                const errorData = JSON.parse(errorBody);
                errorMessage = errorData.message || errorData.error || errorBody;
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(`Tavily API错误 (${searchResp.StatusCode()}): ${errorMessage}`);
        }

        const searchBody = h.ToString(searchResp.Body());
        if (!searchBody) {
            throw new Error("搜索结果为空");
        }

        const searchData = JSON.parse(searchBody);
        if (!searchData.results || !Array.isArray(searchData.results)) {
            throw new Error("搜索结果格式错误");
        }

        // 格式化结果
        const formattedResults = {
            query: query,
            answer: searchData.answer || null,
            total_results: searchData.results.length,
            topic: topic || defaultTopic,
            days: days || null,
            country: country || null,
            chunks_per_source: chunksPerSource,
            include_domains: includeDomains,
            exclude_domains: excludeDomains,
            response_time: searchData.response_time || null,
            results: searchData.results.map(item => ({
                title: item.title,
                url: item.url,
                content: item.content,
                score: item.score || 0,
                published_date: item.published_date || null,
                source: item.source || null,
                raw_content: includeRawContent ? item.raw_content : null
            }))
        };

        // 添加图片结果
        if (includeImages && searchData.images) {
            formattedResults.images = searchData.images.map(img => ({
                url: img.url,
                description: includeImageDescriptions ? img.description : null
            }));
        }

        return JSON.stringify(formattedResults, null, 2);
    } catch (error) {
        if (error.message.includes("Tavily API错误")) {
            throw error;
        }
        throw new Error(`插件执行错误: ${error.message}`);
    }
}
