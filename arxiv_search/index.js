function handle(h, args) {
    // Validate required parameters
    if (!args.query) {
        throw new Error("Query parameter is required");
    }

    // Get settings
    const maxResults = parseInt(h.Settings.max_results) || 10;
    if (maxResults < 1 || maxResults > 100) {
        throw new Error("max_results must be between 1 and 100");
    }

    // Construct the arXiv API URL
    const baseUrl = "https://export.arxiv.org/api/query";
    const searchQuery = encodeURIComponent(args.query);
    const sortBy = args.sort_by || "relevance";
    const sortOrder = args.sort_order || "descending";
    
    const url = `${baseUrl}?search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

    // Make the API request
    const resp = h.Http().Get(url);
    
    if (resp.StatusCode() !== 200) {
        throw new Error("arXiv API request failed: " + h.ToString(resp.Body()));
    }

    // Parse the response
    const xmlResponse = h.ToString(resp.Body());
    
    // Log the response for debugging
    h.Log("arXiv API Response: " + xmlResponse);

    // Return the response
    return xmlResponse;
} 