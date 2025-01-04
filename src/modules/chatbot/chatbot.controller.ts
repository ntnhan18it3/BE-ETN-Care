// import { Body, Controller, Post } from '@nestjs/common';
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, ChatSession } from '@google/generative-ai';
// import { GoogleAIFileManager } from '@google/generative-ai/server';
// import { join } from 'path';

// @Controller('chatbot')
// export class ChatbotController {
//   chatSession: ChatSession;
//   constructor() {
//     this.init();
//   }

//   private async init() {
//     const apiKey = process.env.GEMINI_API_KEY;
//     const genAI = new GoogleGenerativeAI(apiKey);
//     const fileManager = new GoogleAIFileManager(apiKey);

//     /**
//      * Uploads the given file to Gemini.
//      *
//      * See https://ai.google.dev/gemini-api/docs/prompting_with_media
//      */
//     async function uploadToGemini(path, mimeType) {
//       const uploadResult = await fileManager.uploadFile(path, {
//         mimeType,
//         displayName: path
//       });
//       const file = uploadResult.file;
//       console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
//       return file;
//     }

//     /**
//      * Waits for the given files to be active.
//      *
//      * Some files uploaded to the Gemini API need to be processed before they can
//      * be used as prompt inputs. The status can be seen by querying the file's
//      * "state" field.
//      *
//      * This implementation uses a simple blocking polling loop. Production code
//      * should probably employ a more sophisticated approach.
//      */
//     async function waitForFilesActive(files) {
//       console.log('Waiting for file processing...');
//       for (const name of files.map((file) => file.name)) {
//         let file = await fileManager.getFile(name);
//         while (file.state === 'PROCESSING') {
//           process.stdout.write('.');
//           await new Promise((resolve) => setTimeout(resolve, 10_000));
//           file = await fileManager.getFile(name);
//         }
//         if (file.state !== 'ACTIVE') {
//           throw Error(`File ${file.name} failed to process`);
//         }
//       }
//       console.log('...all files ready\n');
//     }

//     const model = genAI.getGenerativeModel({
//       model: 'gemini-1.5-flash'
//     });

//     const generationConfig = {
//       temperature: 1,
//       topP: 0.95,
//       topK: 40,
//       maxOutputTokens: 8192,
//       responseMimeType: 'text/plain'
//     };

//     const dataset = join(process.cwd(), './src/public/dataset/training.pdf');

//     // TODO Make these files available on the local file system
//     // You may need to update the file paths
//     const files = [await uploadToGemini(dataset, 'application/pdf')];

//     // Some files have a processing delay. Wait for them to be ready.
//     await waitForFilesActive(files);

//     const chatSession = model.startChat({
//       generationConfig,
//       history: [
//         {
//           role: 'user',
//           parts: [
//             {
//               fileData: {
//                 mimeType: files[0].mimeType,
//                 fileUri: files[0].uri
//               }
//             }
//           ]
//         }
//       ]
//     });

//     this.chatSession = chatSession;
//   }

//   @Post()
//   async sendMessage(@Body() body: { text: string }) {
//     const text = body.text;
//     try {
//       const result = await this.chatSession.sendMessage(text);
//       const data = result.response.text();
//       return data;
//     } catch (error) {
//       return { message: 'Có lỗi xảy ra, vui lòng thử lại sau!' };
//     }
//   }
// }

// NEW
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};


@Controller('chatbot')
export class ChatbotController {
  chatSession: ChatSession;
  constructor() {
    this.init();
  }

async function init() {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {text: "Có cách nào để tạo nhiều session riêng trong 1 chatbot khi dùng google AI studio không?"},
        ],
      },
      {
        role: "model",
        parts: [
          {text: "Bạn hoàn toàn có thể tạo nhiều session riêng trong một chatbot khi sử dụng Google AI Studio, mặc dù Google AI Studio không cung cấp tính năng quản lý session rõ ràng như một số nền tảng khác. Thay vào đó, bạn có thể sử dụng các kỹ thuật sau để mô phỏng và quản lý các session riêng biệt:\n\n**1. Sử dụng \"Context\" (Bối cảnh) trong Prompt:**\n\n* **Cách hoạt động:**\n    * Bạn có thể lưu trữ thông tin liên quan đến từng session bằng cách đưa chúng vào prompt dưới dạng \"context\" hoặc \"lịch sử hội thoại\".\n    * Mỗi khi người dùng gửi tin nhắn, bạn sẽ thêm tin nhắn đó và lịch sử hội thoại trước đó vào prompt để AI có thể hiểu ngữ cảnh và đưa ra phản hồi phù hợp.\n* **Ví dụ:**\n    ```\n    Lịch sử hội thoại:\n    Người dùng 1: Xin chào!\n    Bot: Chào bạn! Tôi có thể giúp gì?\n    Người dùng 1: Tôi muốn đặt một vé máy bay.\n    Bot: Tuyệt vời! Bạn muốn bay đến đâu?\n\n    Người dùng 2: Xin chào!\n    Bot: Chào bạn! Tôi có thể giúp gì?\n    Người dùng 2: Tôi muốn xem lịch chiếu phim.\n    Bot: OK! Bạn muốn xem phim gì?\n\n    Tin nhắn hiện tại của Người dùng 1: Tôi muốn đến Hà Nội.\n    ```\n    Trong trường hợp này, bạn sẽ gửi toàn bộ \"Lịch sử hội thoại\" của Người dùng 1 (cùng với tin nhắn hiện tại) vào prompt để AI hiểu rằng người dùng này đang muốn đặt vé máy bay đến Hà Nội. Tương tự, bạn sẽ làm điều tương tự với Người dùng 2 nhưng với lịch sử hội thoại và tin nhắn liên quan đến lịch chiếu phim.\n* **Ưu điểm:**\n    * Đơn giản, dễ thực hiện.\n    * Không cần sử dụng code phức tạp.\n* **Nhược điểm:**\n    * Prompt có thể trở nên quá dài khi lịch sử hội thoại lớn, ảnh hưởng đến hiệu suất và độ chính xác của AI.\n    * Việc quản lý và tách biệt các session có thể phức tạp nếu có quá nhiều người dùng.\n\n**2. Sử dụng Metadata trong Prompt:**\n\n* **Cách hoạt động:**\n    * Bạn có thể sử dụng metadata để gắn ID phiên (session ID) vào mỗi prompt.\n    * Trước khi gửi prompt đến AI, bạn sẽ tạo một session ID duy nhất cho mỗi người dùng và gắn ID đó vào prompt.\n    * Khi nhận được phản hồi, bạn sẽ dùng session ID đó để cập nhật lịch sử hội thoại tương ứng.\n* **Ví dụ:**\n    ```\n    Session ID: user123\n    Lịch sử hội thoại (user123):\n    Người dùng 1: Xin chào!\n    Bot: Chào bạn! Tôi có thể giúp gì?\n\n    Tin nhắn hiện tại (user123): Tôi muốn đặt một vé máy bay.\n\n    Session ID: user456\n    Lịch sử hội thoại (user456):\n    Người dùng 2: Xin chào!\n    Bot: Chào bạn! Tôi có thể giúp gì?\n\n    Tin nhắn hiện tại (user456): Tôi muốn xem lịch chiếu phim.\n\n    ```\n    Khi gửi prompt, bạn có thể thêm thông tin session ID vào phần header hoặc metadata của request.\n* **Ưu điểm:**\n    * Dễ dàng theo dõi và phân tách các session.\n    * Có thể dễ dàng mở rộng cho nhiều người dùng.\n* **Nhược điểm:**\n    * Cần code thêm để tạo và quản lý session ID.\n    * Cần xử lý metadata khi nhận response.\n\n**3. Sử dụng Dữ liệu Bên Ngoài (ví dụ: Database):**\n\n* **Cách hoạt động:**\n    * Bạn có thể sử dụng một database (ví dụ: Firebase, Supabase) để lưu trữ lịch sử hội thoại và thông tin liên quan đến từng session.\n    * Khi có tin nhắn mới từ người dùng, bạn sẽ truy vấn database để lấy lịch sử hội thoại của session đó, thêm tin nhắn mới và gửi prompt cho AI.\n    * Sau khi nhận được phản hồi, bạn sẽ cập nhật lịch sử hội thoại trong database.\n* **Ưu điểm:**\n    * Khả năng quản lý session mạnh mẽ, có thể mở rộng cho nhiều người dùng và lượng lớn dữ liệu.\n    * Giảm gánh nặng cho prompt, giúp AI hoạt động hiệu quả hơn.\n* **Nhược điểm:**\n    * Phức tạp, cần kiến thức về database và lập trình.\n    * Cần chi phí để duy trì database.\n\n**Lựa chọn phương pháp phù hợp:**\n\n* **Dự án nhỏ, số lượng người dùng ít:** Phương pháp 1 (sử dụng context trong prompt) có thể đủ dùng.\n* **Dự án có nhiều người dùng, cần theo dõi và phân tách session rõ ràng:** Phương pháp 2 (sử dụng metadata) hoặc 3 (sử dụng database) sẽ phù hợp hơn.\n\n**Lưu ý:**\n\n* Google AI Studio không có cơ chế built-in để quản lý session. Bạn sẽ cần tự thiết kế và triển khai cơ chế này.\n* Chọn phương pháp phù hợp với kỹ năng, tài nguyên và yêu cầu của dự án.\n* Đảm bảo rằng bạn tuân thủ các quy định về bảo mật dữ liệu người dùng khi lưu trữ lịch sử hội thoại.\n\nHy vọng những thông tin trên hữu ích cho bạn! Nếu bạn có bất kỳ câu hỏi nào khác, đừng ngần ngại hỏi nhé.\n"},
        ],
      },
      {
        role: "user",
        parts: [
          {text: "tôi có 1 website thì làm sao để tạo phương án 2 một cách đơn giản nhất"},
        ],
      },
      {
        role: "model",
        parts: [
          {text: "Tuyệt vời! Nếu bạn đã có website, việc triển khai phương án 2 (sử dụng metadata trong prompt) sẽ trở nên dễ dàng hơn nhiều so với việc phải xây dựng một hệ thống backend phức tạp. Dưới đây là hướng dẫn chi tiết để bạn có thể thực hiện phương án này một cách đơn giản nhất:\n\n**Các bước cơ bản:**\n\n1.  **Tạo Session ID:**\n    *   Khi một người dùng truy cập vào chatbot trên website của bạn (thường là khi họ bắt đầu cuộc trò chuyện), bạn cần tạo một session ID duy nhất cho người dùng đó.\n    *   Bạn có thể sử dụng các thư viện JavaScript để tạo ID ngẫu nhiên (ví dụ: `uuid` hoặc `crypto.randomUUID()`).\n    *   **Ví dụ:**\n        ```javascript\n        function generateSessionId() {\n          return crypto.randomUUID(); // Hoặc sử dụng một thư viện tạo UUID\n        }\n\n        // Tạo Session ID khi người dùng bắt đầu chat\n        let sessionId = localStorage.getItem('chatbotSessionId');\n        if (!sessionId) {\n          sessionId = generateSessionId();\n          localStorage.setItem('chatbotSessionId', sessionId);\n        }\n        ```\n        *   **Lưu ý:** Ở đây, chúng ta sử dụng `localStorage` để lưu trữ session ID trên trình duyệt của người dùng. Điều này cho phép duy trì session ID khi người dùng tải lại trang. Bạn có thể sử dụng các phương pháp khác như `sessionStorage` nếu muốn session chỉ tồn tại trong phiên trình duyệt hiện tại.\n\n2.  **Gửi Session ID và Tin Nhắn đến AI Studio:**\n    *   Khi người dùng gửi tin nhắn, bạn cần thu thập session ID từ `localStorage` (hoặc nơi bạn đã lưu trữ) và tin nhắn của người dùng.\n    *   Bạn sẽ gửi cả session ID và tin nhắn này đến Google AI Studio. Cách bạn gửi sẽ tùy thuộc vào cách bạn tích hợp Google AI Studio vào website của bạn (thường là thông qua API).\n    *   **Ví dụ:**\n        ```javascript\n        async function sendMessageToAI(userMessage) {\n          const sessionId = localStorage.getItem('chatbotSessionId');\n          const prompt = `Session ID: ${sessionId}\\n\\nUser: ${userMessage}`;\n\n          // Sử dụng fetch hoặc thư viện HTTP khác để gửi prompt đến API Google AI Studio\n          const response = await fetch('YOUR_GOOGLE_AI_STUDIO_ENDPOINT', {\n            method: 'POST',\n            headers: {\n              'Content-Type': 'application/json'\n            },\n            body: JSON.stringify({ prompt: prompt })\n          });\n\n          const data = await response.json();\n          const botResponse = data.response; // Phụ thuộc vào response của API\n\n          displayBotMessage(botResponse); // Hiển thị phản hồi của bot\n        }\n        ```\n        *   **Lưu ý:** Thay `'YOUR_GOOGLE_AI_STUDIO_ENDPOINT'` bằng endpoint thực tế mà bạn sử dụng để gọi API Google AI Studio. `response.json()` sẽ phụ thuộc vào cấu trúc response của AI Studio, bạn cần điều chỉnh nó cho phù hợp.\n\n3.  **Xử lý Phản Hồi:**\n    *   Khi bạn nhận được phản hồi từ AI Studio, nó có thể không chứa session ID. Vì session ID đã được gắn vào prompt, AI sẽ sử dụng nó để duy trì ngữ cảnh.\n    *   Bạn chỉ cần hiển thị phản hồi của bot lên giao diện người dùng.\n    *   **Ví dụ:**\n        ```javascript\n        function displayBotMessage(message) {\n           // Hiển thị tin nhắn của bot lên giao diện chatbot\n          const chatbox = document.getElementById('chatbox');\n          const botMessageElement = document.createElement('div');\n          botMessageElement.classList.add('bot-message');\n          botMessageElement.textContent = message;\n          chatbox.appendChild(botMessageElement);\n        }\n        ```\n        *   **Lưu ý:** Bạn có thể tùy chỉnh cách hiển thị tin nhắn của bot.\n\n**Giải thích chi tiết:**\n\n*   **`localStorage`:** Được sử dụng để lưu trữ session ID trên trình duyệt. Nó giúp duy trì session khi người dùng tải lại trang.\n*   **`generateSessionId()`:** Hàm này tạo một ID duy nhất cho mỗi session. Bạn có thể sử dụng thư viện `uuid` hoặc `crypto.randomUUID()`.\n*   **`sendMessageToAI()`:** Hàm này gửi tin nhắn của người dùng (kèm theo session ID) đến Google AI Studio API. Nó sử dụng `fetch` để gửi request POST.\n*   **`displayBotMessage()`:** Hàm này hiển thị tin nhắn phản hồi từ bot lên giao diện.\n*   **Prompt:** Trong prompt, chúng ta chèn thêm session ID để AI có thể theo dõi ngữ cảnh cho từng người dùng.\n\n**Ưu điểm của phương pháp này:**\n\n*   **Đơn giản:** Không cần backend phức tạp, chỉ sử dụng JavaScript phía client và API Google AI Studio.\n*   **Dễ triển khai:** Các bước thực hiện khá đơn giản, không đòi hỏi kỹ năng lập trình quá cao.\n*   **Dễ bảo trì:** Vì logic nằm chủ yếu ở phía client, việc bảo trì và sửa lỗi sẽ dễ dàng hơn.\n\n**Lưu ý quan trọng:**\n\n*   **Bảo mật:** `localStorage` có thể bị chỉnh sửa bởi người dùng. Nếu bạn cần bảo mật session ID, bạn nên lưu trữ nó ở phía server.\n*   **Giới hạn:** Phương pháp này phù hợp cho các ứng dụng chatbot nhỏ và vừa. Với ứng dụng lớn, bạn nên xem xét sử dụng database để quản lý session tốt hơn.\n*   **Lịch sử hội thoại:** Phương pháp này không lưu trữ lịch sử hội thoại. Để có tính năng đó, bạn cần kết hợp phương pháp này với một giải pháp lưu trữ lịch sử (ví dụ: sử dụng metadata như đã nói hoặc sử dụng database).\n\n**Tóm lại:**\n\nPhương án này là một cách tiếp cận đơn giản và hiệu quả để tạo nhiều session trong chatbot của bạn khi sử dụng Google AI Studio, mà không cần một backend phức tạp. Bạn chỉ cần một chút kiến thức về JavaScript để triển khai nó trên website của mình. Chúc bạn thành công! Nếu bạn có bất kỳ câu hỏi nào khác, đừng ngần ngại hỏi nhé.\n"},
        ],
      },
    ],
  });

  this.chatSession = chatSession
  console.log("Chat response:" + result.response.text());
}

  @Post()
  async sendMessage(@Body() body: { text: string }) {
    const text = body.text;
    try {
      const result = await this.chatSession.sendMessage(text);
      const data = result.response.text();
      return data;
    } catch (error) {
      return { message: 'Có lỗi xảy ra, vui lòng thử lại sau!' };
    }
  }
}
