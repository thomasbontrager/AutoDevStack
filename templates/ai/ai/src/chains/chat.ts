import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { createLLM } from '../lib/llm.js';

const sessionHistories: Map<string, InMemoryChatMessageHistory> = new Map();

function getSessionHistory(sessionId: string): InMemoryChatMessageHistory {
  if (!sessionHistories.has(sessionId)) {
    sessionHistories.set(sessionId, new InMemoryChatMessageHistory());
  }
  return sessionHistories.get(sessionId)!;
}

const systemPrompt = process.env.AI_SYSTEM_PROMPT ||
  'You are a helpful, friendly AI assistant. Answer questions clearly and concisely.';

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
]);

export function createChatChain() {
  const llm = createLLM();
  const chain = prompt.pipe(llm);

  return new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: getSessionHistory,
    inputMessagesKey: 'input',
    historyMessagesKey: 'history',
  });
}
