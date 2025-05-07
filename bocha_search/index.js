function handle(h, args) {
    let { query, freshness, summary: summaryArg } = args;
    if (!query) {
        throw new Error("参数错误：缺少搜索关键词 'query'");
    }

    const apiKey = h.Settings.api_key;
    if (!apiKey) {
        throw new Error("插件配置错误：缺少 API 密钥");
    }

    // 使用设置作为默认值
    const count = parseInt(h.Settings.count) || 10;
    
    // 处理摘要设置
    let summary = false;
    if (summaryArg !== undefined) {
        // 优先使用参数中指定的值
        summary = summaryArg;
    } else {
        // 使用设置中的值
        const summarySettingValue = h.Settings.summary || "auto";
        if (summarySettingValue === "true") {
            summary = true;
        } else if (summarySettingValue === "auto") {
            // 自动模式 - 由LLM函数调用决定
            summary = false;  // 默认不包含摘要，让LLM决定是否需要
        }
    }

    // 构建搜索请求体
    const searchRequestBody = {
        query: query,
        freshness: freshness || "noLimit",
        summary: summary,
        count: count,
        page: 1  // 固定使用第1页
    };

    // 搜索请求
    const http = h.Http()
        .SetHeader("Content-Type", "application/json")
        .SetHeader("Authorization", `Bearer ${apiKey}`)
        .SetBody(JSON.stringify(searchRequestBody));

    try {
        const searchResp = http.Post("https://api.bochaai.com/v1/web-search");

        if (searchResp.StatusCode() !== 200) {
            const errorBody = h.ToString(searchResp.Body());
            let errorMessage = "搜索请求失败";
            try {
                const errorData = JSON.parse(errorBody);
                errorMessage = errorData.msg || errorData.message || errorBody;
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(`博查 API错误 (${searchResp.StatusCode()}): ${errorMessage}`);
        }

        const searchBody = h.ToString(searchResp.Body());
        if (!searchBody) {
            throw new Error("搜索结果为空");
        }

        const searchData = JSON.parse(searchBody);
        if (!searchData.data || !searchData.data.webPages) {
            throw new Error("搜索结果格式错误");
        }

        // 格式化结果
        const formattedResults = {
            query: query,
            total_results: searchData.data.webPages.totalEstimatedMatches || 0,
            freshness: freshness || "noLimit",
            summary_included: summary,
            results: searchData.data.webPages.value.map(item => ({
                title: item.name,
                url: item.url,
                display_url: item.displayUrl,
                snippet: item.snippet,
                summary: item.summary || null,
                site_name: item.siteName,
                site_icon: item.siteIcon,
                date_last_crawled: item.dateLastCrawled,
                cached_page_url: item.cachedPageUrl,
                language: item.language,
                is_family_friendly: item.isFamilyFriendly,
                is_navigational: item.isNavigational
            }))
        };

        // 添加图片结果（如果API返回）
        if (searchData.data.images && searchData.data.images.value) {
            formattedResults.images = searchData.data.images.value.map(img => ({
                name: img.name,
                thumbnail_url: img.thumbnailUrl,
                content_url: img.contentUrl,
                host_page_url: img.hostPageUrl,
                host_page_display_url: img.hostPageDisplayUrl,
                width: img.width,
                height: img.height,
                date_published: img.datePublished,
                content_size: img.contentSize,
                encoding_format: img.encodingFormat
            }));
        }

        return JSON.stringify(formattedResults, null, 2);
    } catch (error) {
        if (error.message.includes("博查 API错误")) {
            throw error;
        }
        throw new Error(`插件执行错误: ${error.message}`);
    }
} 