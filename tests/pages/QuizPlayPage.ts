import { Page, expect } from '@playwright/test';

/**
 * Page Object for the active quiz-play flow (player side).
 * Covers: reading a question, selecting an answer, submitting,
 * and verifying feedback (correct / incorrect).
 */
export class QuizPlayPage {
  constructor(private page: Page) {}

  /** Wait until the question screen is rendered. */
  async waitForQuestion() {
    await expect(this.page.locator('[data-testid="question"], .question, [class*="question"]').first()).toBeVisible();
  }

  /** Return the text of the currently displayed question. */
  async getQuestionText(): Promise<string> {
    const el = this.page.locator('[data-testid="question"], .question, [class*="question"]').first();
    return (await el.textContent()) ?? '';
  }

  /**
   * Select an answer option by its visible label text.
   * This targets the clickable answer card / button.
   */
  async selectAnswer(optionText: string) {
    await this.page.getByRole('button', { name: optionText }).click();
  }

  /**
   * Select an answer option by its 0-based index among the rendered choices.
   * Use this when option text is not known in advance.
   */
  async selectAnswerByIndex(index: number) {
    const options = this.page.getByRole('button').filter({ hasText: /^[A-D]|option/i });
    await options.nth(index).click();
  }

  /** Click the submit / confirm button after choosing an answer. */
  async submitAnswer() {
    const submitBtn = this.page.getByRole('button', { name: /submit|confirm|next/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
    // Some implementations auto-advance on selection — this is a no-op then.
  }

  /** Assert that the "correct" feedback is shown. */
  async expectCorrectFeedback() {
    await expect(
      this.page.getByText(/correct|right|well done|¡correcto/i)
    ).toBeVisible();
  }

  /** Assert that the "incorrect" feedback is shown. */
  async expectIncorrectFeedback() {
    await expect(
      this.page.getByText(/incorrect|wrong|oops|¡incorrecto/i)
    ).toBeVisible();
  }

  /**
   * Attempt to advance without selecting any answer and verify that
   * the app prevents progression (error message or button remains disabled).
   */
  async attemptSubmitWithoutSelection() {
    const submitBtn = this.page.getByRole('button', { name: /submit|confirm|next/i });
    await submitBtn.click();
  }

  /** Assert that progressing without an answer is blocked. */
  async expectSelectionRequired() {
    // The app should either show a warning or keep the submit button disabled.
    const warning = this.page.getByText(/select|choose|pick|required|selecciona/i);
    const submitDisabled = this.page.getByRole('button', { name: /submit|confirm|next/i });

    const warningVisible = await warning.isVisible();
    const isDisabled = await submitDisabled.isDisabled();

    expect(warningVisible || isDisabled).toBeTruthy();
  }
}
