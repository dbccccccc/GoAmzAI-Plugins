// 支持的语言和版本列表
const LANGUAGE_VERSIONS = {
    "python3": { 
        name: "Python 3", 
        versions: ["3.5.1", "3.6.3", "3.6.5", "3.7.4", "3.9.9", "3.11.5"],
        defaultVersionIndex: "5" // 3.11.5
    },
    "java": { 
        name: "Java", 
        versions: ["JDK 1.8.0_66", "JDK 9.0.1", "JDK 10.0.1", "JDK 11.0.4", "JDK 17.0.1", "JDK 21.0.1"],
        defaultVersionIndex: "5" // JDK 21.0.1
    },
    "javascript": { 
        name: "JavaScript", 
        versions: ["Node.js 6.3.1", "Node.js 9.2.0", "Node.js 10.1.0", "Node.js 12.11.1", "Node.js 17.1.0", "Node.js 20.9.0", "Node.js 21.2.0"],
        defaultVersionIndex: "6" // Node.js 21.2.0
    },
    "cpp": { 
        name: "C++", 
        versions: ["GCC 5.3.0", "Zapcc 5.0.0", "GCC 7.2.0", "GCC 8.1.0", "GCC 9.1.0", "GCC 11.1.0", "GCC 13.2.1"],
        defaultVersionIndex: "6" // GCC 13.2.1
    },
    "csharp": { 
        name: "C#", 
        versions: ["mono 4.2.2", "mono 5.0.0", "mono 5.10.1", "mono 6.0.0", "mono-6.12.0", "dotnet: 7.0.13"],
        defaultVersionIndex: "5" // dotnet: 7.0.13
    },
    "php": { 
        name: "PHP", 
        versions: ["5.6.16", "7.1.11", "7.2.5", "7.3.10", "8.0.13", "8.2.12"],
        defaultVersionIndex: "5" // 8.2.12
    },
    "ruby": { 
        name: "Ruby", 
        versions: ["2.2.4", "2.4.2p198", "2.5.1p57", "2.6.5", "3.0.2", "3.0.6"],
        defaultVersionIndex: "5" // 3.0.6
    },
    "go": { 
        name: "Go", 
        versions: ["1.5.2", "1.9.2", "1.10.2", "1.13.1", "1.17.3", "1.21.4"],
        defaultVersionIndex: "5" // 1.21.4
    },
    "rust": { 
        name: "Rust", 
        versions: ["1.10.0", "1.21.0", "1.25.0", "1.38.0", "1.56.1", "1.73.0"],
        defaultVersionIndex: "5" // 1.73.0
    },
    "swift": { 
        name: "Swift", 
        versions: ["2.2", "3.1.1", "4.1", "5.1", "5.5", "5.9.1"],
        defaultVersionIndex: "5" // 5.9.1
    },
    "kotlin": { 
        name: "Kotlin", 
        versions: ["1.1.51 (JRE 9.0.1+11)", "1.2.40 (JRE 10.0.1)", "1.3.50 (JRE 11.0.4)", "1.6.0 (JRE 17.0.1+12)", "1.9.10 (JRE 17.0.1+12)"],
        defaultVersionIndex: "4" // 1.9.10
    },
    "typescript": { 
        name: "TypeScript", 
        versions: ["5.2.2"],
        defaultVersionIndex: "0" // 5.2.2
    }
};

function handle(h, args) {
    try {
        const { script, language, stdin = "", versionIndex } = args;
        
        // 检查代码
        if (!script || script.trim() === "") {
            throw new Error("参数错误：缺少要执行的代码或代码为空");
        }

        // 检查语言
        if (!language) {
            throw new Error("参数错误：缺少编程语言");
        }

        // 检查语言是否支持
        if (!LANGUAGE_VERSIONS[language]) {
            throw new Error(`不支持的语言: ${language}\n支持的语言: ${Object.keys(LANGUAGE_VERSIONS).join(", ")}`);
        }

        // 检查API凭证
        const clientId = h.Settings.client_id;
        const clientSecret = h.Settings.client_secret;
        
        if (!clientId || !clientSecret) {
            throw new Error("插件配置错误：缺少 Client ID 或 Client Secret。请在插件设置中配置您的JDoodle API凭证。");
        }

        // 构建API请求体
        const requestBody = {
            clientId: clientId,
            clientSecret: clientSecret,
            script: script,
            language: language,
            versionIndex: versionIndex !== undefined ? versionIndex.toString() : LANGUAGE_VERSIONS[language].defaultVersionIndex,
            stdin: stdin
        };

        // 构建HTTP请求
        const http = h.Http()
            .SetHeader("Content-Type", "application/json")
            .SetBody(JSON.stringify(requestBody));

        // 发送请求
        const resp = http.Post("https://api.jdoodle.com/v1/execute");

        // 处理HTTP状态码
        if (resp.StatusCode() === 401) {
            throw new Error("认证错误：Client ID 或 Client Secret 无效");
        } else if (resp.StatusCode() === 429) {
            throw new Error("达到每日限额：您已达到JDoodle API的每日使用限制");
        } else if (resp.StatusCode() !== 200) {
            throw new Error(`API错误 (${resp.StatusCode()})`);
        }

        const responseBody = h.ToString(resp.Body());
        if (!responseBody) {
            throw new Error("API返回空结果");
        }

        // 解析结果
        const result = JSON.parse(responseBody);
        
        // 格式化响应
        const formattedResult = {
            language: language,
            language_name: LANGUAGE_VERSIONS[language].name,
            available_versions: LANGUAGE_VERSIONS[language].versions,
            current_version: LANGUAGE_VERSIONS[language].versions[parseInt(LANGUAGE_VERSIONS[language].defaultVersionIndex)],
            version_index: LANGUAGE_VERSIONS[language].defaultVersionIndex,
            output: result.output || null,
            error: result.error || null,
            status_code: result.statusCode,
            memory: result.memory,
            cpu_time: result.cpuTime,
            is_execution_success: result.statusCode === 200
        };

        // 根据结果类型添加合适的提示
        const executionSummary = result.statusCode === 200 ? "✅ 执行成功" : "❌ 执行失败";

        // 添加更丰富的响应信息
        formattedResult.execution_summary = executionSummary;
        formattedResult.formatted_output = `${executionSummary}\n\n${result.output || result.error || "无输出"}`;
        
        if (result.cpuTime) {
            formattedResult.formatted_output += `\n\n执行时间: ${result.cpuTime}秒`;
        }
        
        if (result.memory) {
            formattedResult.formatted_output += `\n内存使用: ${result.memory}KB`;
        }

        return JSON.stringify(formattedResult, null, 2);
    } catch (error) {
        throw new Error(`代码执行错误: ${error.message}`);
    }
}