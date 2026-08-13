import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { QuizCreatorPage } from './pages/QuizCreatorPage';
import { QuizLobbyPage } from './pages/QuizLobbyPage';
import { QuizPlayPage } from './pages/QuizPlayPage';

/**
 * Quiz flow — end-to-end tests for:
 *   1. Creating a quiz with questions (host side)
 *   2. Joining with a nickname (player side)
 *   3. Answering correctly
 *   4. Answering incorrectly
 *   5. Attempting to continue without selecting an answer
 *
 * Each test uses two browser contexts (host + player) to simulate
 * the real two-screen dynamic of the app.
 *
 * NOTE: selectors in the Page Objects are written against the visible
 * roles / labels of kahootlite.vercel.app. Adjust them if the app's
 * DOM structure differs from what Playwright introspects at runtime.
 */

const QUIZ_TITLE = 'Geography Quiz';
const QUESTION_TEXT = 'What is the capital of France?';
const ANSWERS: [string, string, string, string] = ['Paris', 'London', 'Berlin', 'Madrid'];
const CORRECT_INDEX = 0; // "Paris"
const INCORRECT_OPTION = 'London';
const PLAYER_NICKNAME = 'TestPlayer';

/** Helper: open a second browser context for the player. */
async function openPlayerContext(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test.describe('Quiz flow', () => {

  test('host can create a quiz with a question', async ({ page }) => {
    // Validates that a host can define a quiz title and add at least one
    // question with answer options and a correct answer, then obtain a PIN.
    const creator = new QuizCreatorPage(page);

    await creator.goto();
    await creator.startCreatingQuiz();
    await creator.setQuizTitle(QUIZ_TITLE);
    await creator.addQuestion(QUESTION_TEXT, ANSWERS, CORRECT_INDEX);

    const pin = await creator.saveAndGetPin();

    // The PIN must be a non-empty string (numeric code)
    expect(pin.trim()).toMatch(/\d+/);
  });

  test('player can join a game with a nickname', async ({ page, browser }) => {
    // Validates the full join journey: entering a PIN → entering a nickname →
    // seeing the waiting-room with the nickname confirmed.

    // ── Host: create quiz and get PIN ──────────────────────────────────────
    const creator = new QuizCreatorPage(page);
    await creator.goto();
    await creator.startCreatingQuiz();
    await creator.setQuizTitle(QUIZ_TITLE);
    await creator.addQuestion(QUESTION_TEXT, ANSWERS, CORRECT_INDEX);
    const pin = await creator.saveAndGetPin();

    // ── Player: open a fresh context to simulate a separate device ─────────
    const { context: playerCtx, page: playerPage } = await openPlayerContext(browser);
    const lobby = new QuizLobbyPage(playerPage);

    await lobby.goto();
    await lobby.startJoining();
    await lobby.enterPin(pin.trim());
    await lobby.enterNickname(PLAYER_NICKNAME);
    await lobby.waitForLobby();
    await lobby.expectNicknameVisible(PLAYER_NICKNAME);

    await playerCtx.close();
  });

  test('player receives correct feedback when answering correctly', async ({ page, browser }) => {
    // Validates that the app shows a "correct" indicator when the player
    // picks the right answer option.

    // ── Host setup ─────────────────────────────────────────────────────────
    const creator = new QuizCreatorPage(page);
    await creator.goto();
    await creator.startCreatingQuiz();
    await creator.setQuizTitle(QUIZ_TITLE);
    await creator.addQuestion(QUESTION_TEXT, ANSWERS, CORRECT_INDEX);
    const pin = await creator.saveAndGetPin();

    // ── Player joins ────────────────────────────────────────────────────────
    const { context: playerCtx, page: playerPage } = await openPlayerContext(browser);
    const lobby = new QuizLobbyPage(playerPage);
    await lobby.goto();
    await lobby.startJoining();
    await lobby.enterPin(pin.trim());
    await lobby.enterNickname(PLAYER_NICKNAME);
    await lobby.waitForLobby();

    // ── Host starts the game ────────────────────────────────────────────────
    await page.getByRole('button', { name: /start|begin|launch/i }).click();

    // ── Player answers correctly ────────────────────────────────────────────
    const quiz = new QuizPlayPage(playerPage);
    await quiz.waitForQuestion();
    await quiz.selectAnswer(ANSWERS[CORRECT_INDEX]); // 'Paris'
    await quiz.submitAnswer();
    await quiz.expectCorrectFeedback();

    await playerCtx.close();
  });

  test('player receives incorrect feedback when answering incorrectly', async ({ page, browser }) => {
    // Validates that the app shows an "incorrect" indicator when the player
    // picks a wrong answer option.

    // ── Host setup ─────────────────────────────────────────────────────────
    const creator = new QuizCreatorPage(page);
    await creator.goto();
    await creator.startCreatingQuiz();
    await creator.setQuizTitle(QUIZ_TITLE);
    await creator.addQuestion(QUESTION_TEXT, ANSWERS, CORRECT_INDEX);
    const pin = await creator.saveAndGetPin();

    // ── Player joins ────────────────────────────────────────────────────────
    const { context: playerCtx, page: playerPage } = await openPlayerContext(browser);
    const lobby = new QuizLobbyPage(playerPage);
    await lobby.goto();
    await lobby.startJoining();
    await lobby.enterPin(pin.trim());
    await lobby.enterNickname(PLAYER_NICKNAME);
    await lobby.waitForLobby();

    // ── Host starts the game ────────────────────────────────────────────────
    await page.getByRole('button', { name: /start|begin|launch/i }).click();

    // ── Player selects a wrong answer ───────────────────────────────────────
    const quiz = new QuizPlayPage(playerPage);
    await quiz.waitForQuestion();
    await quiz.selectAnswer(INCORRECT_OPTION); // 'London'
    await quiz.submitAnswer();
    await quiz.expectIncorrectFeedback();

    await playerCtx.close();
  });

  test('player cannot proceed without selecting an answer', async ({ page, browser }) => {
    // Validates that the app blocks progression when no answer has been chosen,
    // either by disabling the submit button or showing a warning message.

    // ── Host setup ─────────────────────────────────────────────────────────
    const creator = new QuizCreatorPage(page);
    await creator.goto();
    await creator.startCreatingQuiz();
    await creator.setQuizTitle(QUIZ_TITLE);
    await creator.addQuestion(QUESTION_TEXT, ANSWERS, CORRECT_INDEX);
    const pin = await creator.saveAndGetPin();

    // ── Player joins ────────────────────────────────────────────────────────
    const { context: playerCtx, page: playerPage } = await openPlayerContext(browser);
    const lobby = new QuizLobbyPage(playerPage);
    await lobby.goto();
    await lobby.startJoining();
    await lobby.enterPin(pin.trim());
    await lobby.enterNickname(PLAYER_NICKNAME);
    await lobby.waitForLobby();

    // ── Host starts the game ────────────────────────────────────────────────
    await page.getByRole('button', { name: /start|begin|launch/i }).click();

    // ── Player tries to submit without selecting ────────────────────────────
    const quiz = new QuizPlayPage(playerPage);
    await quiz.waitForQuestion();
    await quiz.attemptSubmitWithoutSelection();
    await quiz.expectSelectionRequired();

    await playerCtx.close();
  });

});
