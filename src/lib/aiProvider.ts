import { GlobalAIConfig, AIProvider, AIScenario, AIProviderProfile } from '../types';

const INITIAL_CONFIG: GlobalAIConfig = {
    profiles: {
        gemini: {
            id: 'gemini',
            name: 'Google Gemini',
            apiKey: '', // Moved to server-side proxy
            model: 'gemini-1.5-flash',
            isOnlineEnabled: true
        },
        deepseek: {
            id: 'deepseek',
            name: 'DeepSeek',
            apiKey: '',
            model: 'deepseek-chat',
            baseUrl: 'https://api.deepseek.com',
            isOnlineEnabled: false
        },
        doubao: {
            id: 'doubao',
            name: '字节跳动 豆包',
            apiKey: '',
            model: '', // 豆包通常需要填写具体部署的 Endpoint ID
            baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            isOnlineEnabled: false
        },
        openai: {
            id: 'openai',
            name: 'OpenAI',
            apiKey: '',
            model: 'gpt-4o-mini',
            isOnlineEnabled: false
        },
        anthropic: {
            id: 'anthropic',
            name: 'Anthropic Claude',
            apiKey: '',
            model: 'claude-3-5-sonnet-20240620',
            isOnlineEnabled: false
        },
        custom: {
            id: 'custom',
            name: '自定义中转接口',
            apiKey: '',
            model: '',
            isOnlineEnabled: false
        }
    },
    scenarioMapping: {
        explanation: 'gemini',
        pronunciation: 'gemini',
        translation: 'gemini',
        general: 'gemini'
    },
    lastUpdated: new Date().toISOString()
};

// 获取全局配置
export const getGlobalAIConfig = (): GlobalAIConfig => {
    const saved = localStorage.getItem('global_ai_config');
    if (!saved) return INITIAL_CONFIG;
    
    try {
        const parsed = JSON.parse(saved);
        // 合并初始配置中可能新增的 Provider
        return {
            ...INITIAL_CONFIG,
            ...parsed,
            profiles: { ...INITIAL_CONFIG.profiles, ...parsed.profiles },
            scenarioMapping: { ...INITIAL_CONFIG.scenarioMapping, ...parsed.scenarioMapping }
        };
    } catch {
        return INITIAL_CONFIG;
    }
};

export const saveGlobalAIConfig = (config: GlobalAIConfig) => {
    localStorage.setItem('global_ai_config', JSON.stringify({
        ...config,
        lastUpdated: new Date().toISOString()
    }));
};

// 废弃旧的 getActiveAIConfig 兼容层
export const getActiveAIConfig = (scenario: AIScenario = 'general'): AIProviderProfile => {
    const global = getGlobalAIConfig();
    const providerId = global.scenarioMapping[scenario] || 'gemini';
    return global.profiles[providerId];
};

// 统一 AI 调用接口，增加场景参数
export async function callAI(prompt: string, scenario: AIScenario = 'general') {
    const profile = getActiveAIConfig(scenario);
    
    // 逻辑分流
    if (profile.id === 'gemini' && !profile.baseUrl) {
        return callGemini(prompt, profile);
    } else {
        return callOpenAICompatible(prompt, profile);
    }
}

async function callGemini(prompt: string, profile: AIProviderProfile) {
    // Point 22: If no key is provided in the profile, we use our server-side proxy
    // which has the environment's GEMINI_API_KEY.
    if (!profile.apiKey) {
        console.log(`[Scenario: Explanation] Using Server-Side AI Proxy`);
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, scenario: 'explanation', model: profile.model })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`AI Proxy Error: ${err.error || response.statusText}`);
        }
        return await response.json();
    }

    console.log(`[Scenario: Explanation] 调用 Gemini REST API (Client Direct):`, profile.model);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${profile.model}:generateContent?key=${profile.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini API Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textTarget = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textTarget) throw new Error("Gemini 返回内容被过滤");
    
    return JSON.parse(textTarget.trim());
}

async function callOpenAICompatible(prompt: string, profile: AIProviderProfile) {
    console.log(`[Scenario: General] 调用兼容接口 (${profile.name}):`, profile.baseUrl || 'Default', profile.model);
    
    if (!profile.apiKey && profile.id !== 'gemini') {
        throw new Error(`请在设置中配置 ${profile.name} 的 API Key`);
    }

    const baseUrl = profile.baseUrl || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${profile.apiKey}`
        },
        body: JSON.stringify({
            model: profile.model,
            messages: [{ 
                role: 'user', 
                content: prompt + "\n\n请务必仅返回有效的 JSON 对象，不要包含 Markdown 书写格式标记。" 
            }],
            temperature: 0.7,
        })
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const err = await response.json();
            errorMsg = err.error?.message || errorMsg;
        } catch {}
        throw new Error(`${profile.name} Provider Error: ${errorMsg}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("模型返回内容为空");

    content = content.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(content);
}
