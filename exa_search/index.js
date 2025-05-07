function handle(h, args) {
    // Validate required parameters
    if (!args.query) {
        throw new Error("Search query parameter is required");
    }

    // Get settings
    const apiKey = h.Settings.api_key;
    if (!apiKey) {
        throw new Error("API key is not configured");
    }

    // Build request parameters
    const requestParams = {
        query: args.query,
        numResults: parseInt(h.Settings.num_results || "5", 10),
        type: h.Settings.search_type || "auto",
        useAutoprompt: true
    };

    // Add category if provided
    if (args.category) {
        requestParams.category = args.category;
    }

    // Add domain filters
    const includeDomains = h.Settings.include_domains;
    if (includeDomains) {
        requestParams.includeDomains = includeDomains.split(",").map(d => d.trim());
    }

    const excludeDomains = h.Settings.exclude_domains;
    if (excludeDomains) {
        requestParams.excludeDomains = excludeDomains.split(",").map(d => d.trim());
    }

    // Configure content retrieval options
    requestParams.contents = {
        text: true,
        summary: {}
    };
    
    // Send API request to Exa using the chained method pattern
    const http = h.Http()
        .SetHeader("x-api-key", apiKey)
        .SetHeader("Content-Type", "application/json")
        .SetBody(JSON.stringify(requestParams));

    try {
        const resp = http.Post("https://api.exa.ai/search");

        if (resp.StatusCode() !== 200) {
            const errorBody = h.ToString(resp.Body());
            let errorMessage = "API request failed";
            try {
                const errorData = JSON.parse(errorBody);
                errorMessage = errorData.message || errorData.error || errorBody;
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(`Exa API error (${resp.StatusCode()}): ${errorMessage}`);
        }

        const responseBody = h.ToString(resp.Body());
        if (!responseBody) {
            throw new Error("Empty response from Exa API");
        }

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseBody);
        } catch (e) {
            throw new Error(`Failed to parse API response: ${e.message}`);
        }

        if (!parsedResponse) {
            throw new Error("Invalid response from Exa API");
        }

        // Check if response contains error
        if (parsedResponse.error) {
            throw new Error(`API Error: ${parsedResponse.error}`);
        }

        // Check if response has required fields
        if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
            throw new Error("Invalid response format from Exa API - missing results array");
        }
        
        // Format response results
        const formattedResults = {
            requestId: parsedResponse.requestId,
            autopromptString: parsedResponse.autopromptString,
            autoDate: parsedResponse.autoDate,
            resolvedSearchType: parsedResponse.resolvedSearchType,
            searchType: parsedResponse.searchType,
            costDollars: parsedResponse.costDollars,
            results: parsedResponse.results.map(result => ({
                title: result.title,
                url: result.url,
                publishedDate: result.publishedDate,
                author: result.author,
                score: result.score,
                id: result.id,
                image: result.image,
                favicon: result.favicon,
                text: result.text || "",
                highlights: result.highlights || [],
                highlightScores: result.highlightScores || [],
                summary: result.summary,
                subpages: result.subpages ? result.subpages.map(subpage => ({
                    title: subpage.title,
                    url: subpage.url,
                    publishedDate: subpage.publishedDate,
                    author: subpage.author,
                    score: subpage.score,
                    id: subpage.id,
                    image: subpage.image,
                    favicon: subpage.favicon,
                    text: subpage.text || "",
                    highlights: subpage.highlights || [],
                    highlightScores: subpage.highlightScores || [],
                    summary: subpage.summary
                })) : [],
                extras: result.extras || {}
            }))
        };

        return JSON.stringify(formattedResults);
    } catch (error) {
        if (error.message.includes("Exa API error")) {
            throw error;
        }
        throw new Error(`Plugin execution error: ${error.message}`);
    }
} 