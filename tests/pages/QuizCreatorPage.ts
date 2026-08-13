import { Page, expect } from '@playwright/test';

/**
 * Page Object for the quiz creation flow (host side).
 * Covers: entering a quiz title, adding questions with options,
 * marking the correct answer, and starting the game.
 */
export class QuizCreatorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('https://kahootlite.vercel.app/');
  }

  /** Click the button that initiates quiz creation (host role). */
  async startCreatingQuiz() {
    await this.page.getByRole('button', { name: /create.*quiz|host/i }).click();
  }

  /** Fill in the quiz title. */
  async setQuizTitle(title: string) {
    await this.page.getByLabel(/quiz.*title|title/i).fill(title);
  }

  /**
   * Add a single question with four answer options and the index of the
   * correct one (0-based).
   */
  async addQuestion(
    questionText: string,
    options: [string, string, string, string],
    correctIndex: number
  ) {
    // Open "add question" form if there is an explicit trigger
    const addBtn = this.page.getByRole('button', { name: /add question/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
    }

    await this.page.getByLabel(/question/i).fill(questionText);

    // Fill each answer option
    const optionInputs = this.page.getByRole('textbox').filter({ hasNotText: /quiz.*title/i });
    for (let i = 0; i < options.length; i++) {
      await optionInputs.nth(i).fill(options[i]);
    }

    // Mark the correct answer
    const correctRadios = this.page.getByRole('radio');
    await correctRadios.nth(correctIndex).check();
  }

  /** Save the quiz and obtain the game PIN / join code. */
  async saveAndGetPin(): Promise<string> {
    await this.page.getByRole('button', { name: /save|create|start/i }).click();
    // The PIN is typically shown as a prominent number on screen
    const pinLocator = this.page.locator('[data-testid="game-pin"], .game-pin, [class*="pin"]').first();
    await expect(pinLocator).toBeVisible();
    return (await pinLocator.textContent()) ?? '';
  }
}
