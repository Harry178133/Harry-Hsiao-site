const fs = require('fs');
const path = require('path');

// 設定資料夾路徑
const KNOWLEDGE_DIR = path.join(__dirname, '知識分享區');
const OUTPUT_FILE = path.join(KNOWLEDGE_DIR, 'knowledge-data.js');

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseHtmlFile(filePath, filename) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        // 1. 取得標題 (Title)
        let title = '';
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim().replace(/\s+/g, ' ');
        } else {
            title = path.basename(filename, '.html');
        }

        // 2. 取得一句話摘要 (Summary / Description)
        let summary = '';
        
        // A. 尋找 meta description
        const metaDescMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
                             content.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
        if (metaDescMatch && metaDescMatch[1]) {
            summary = metaDescMatch[1].trim();
        }
        
        // B. 若沒有，尋找 HTML 註解 <!-- summary: ... -->
        if (!summary) {
            const commentMatch = content.match(/<!--\s*summary:\s*([\s\S]*?)\s*-->/i);
            if (commentMatch && commentMatch[1]) {
                summary = commentMatch[1].trim();
            }
        }
        
        // C. 若沒有，尋找 class="subtitle" 的元素內容
        if (!summary) {
            const subtitleMatch = content.match(/class=["']subtitle["'][^>]*>([\s\S]*?)<\/(?:p|div|span)>/i) ||
                                  content.match(/>([\s\S]*?)<\/(?:p|div|span)[^>]*class=["']subtitle["']/i); // 簡單配對
            if (subtitleMatch && subtitleMatch[1]) {
                // 清除裡面的 HTML 標籤
                summary = subtitleMatch[1].replace(/<[^>]+>/g, '').trim();
            }
        }

        // D. 最終 Fallback：擷取 body 內的前 60 個字
        if (!summary) {
            const bodyMatch = content.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
            if (bodyMatch && bodyMatch[1]) {
                const textOnly = bodyMatch[1]
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                summary = textOnly.slice(0, 60) + (textOnly.length > 60 ? '...' : '');
            }
        }
        
        if (!summary) {
            summary = '無提供簡介';
        } else {
            summary = summary.replace(/\s+/g, ' ');
        }

        // 3. 取得日期 (優先使用註解中的 date，否則使用檔案修改時間)
        let dateStr = '';
        const dateMatch = content.match(/<!--\s*date:\s*(\d{4}-\d{2}-\d{2})\s*-->/i);
        if (dateMatch && dateMatch[1]) {
            dateStr = dateMatch[1].trim();
        } else {
            dateStr = formatLocalDate(stats.mtime || stats.birthtime || new Date());
        }

        return {
            filename: filename,
            title: title,
            summary: summary,
            date: dateStr,
            path: `知識分享區/${filename}`
        };
    } catch (err) {
        console.error(`解析檔案失敗: ${filename}`, err);
        return null;
    }
}

function main() {
    console.log('開始掃描知識分享區...');
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
        console.error(`找不到「知識分享區」資料夾，路徑: ${KNOWLEDGE_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');
    
    console.log(`找到 ${htmlFiles.length} 個 HTML 知識檔案`);
    
    const dataList = [];
    for (const file of htmlFiles) {
        const filePath = path.join(KNOWLEDGE_DIR, file);
        const item = parseHtmlFile(filePath, file);
        if (item) {
            dataList.push(item);
            console.log(`- 已解析 [${item.title}]`);
        }
    }

    // 依日期排序，由新到舊
    dataList.sort((a, b) => b.date.localeCompare(a.date));

    // 寫入檔案
    const outputContent = `// 此檔案為自動生成，請勿手動修改。
// 由 update_knowledge.js 於 ${formatLocalDate(new Date())} 產生。
const KNOWLEDGE_DATA = ${JSON.stringify(dataList, null, 2)};
`;

    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
    console.log(`成功產生知識清單 js 檔: ${OUTPUT_FILE}`);
}

main();
