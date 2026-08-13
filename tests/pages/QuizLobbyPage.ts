import { Page, expect } from '@playwright/test';

/**
 * Page Object for the player join / lobby flow.
 * Covers: entering the game PIN and a nickname, then waiting for the game to start.
 */
export class QuizLobbyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('https://kahootlite.vercel.app/');
  }

  /** Click the button that lets a player join an existing game. */
  async startJoining() {
    await this.page.getByRole('button', { name: /join/i }).click();
  }

  /** Enter the game PIN shown on the host screen. */
  async enterPin(pin: string) {
    await this.page.getByLabel(/pin|game.*code|code/i).fill(pin);
    await this.page.getByRole('button', { name: /next|continue|join/i }).click();
  }

  /** Enter the player nickname. */
  async enterNickname(nickname: string) {
    await this.page.getByLabel(/nickname|name/i).fill(nickname);
    await this.page.getByRole('button', { name: /join|enter|play/i }).click();
  }

  /** Wait until the lobby / waiting-room screen is shown. */
  async waitForLobby() {
    await expect(
      this.page.getByText(/waiting|lobby|get ready/i)
    ).toBeVisible();
  }

  /** Verify the nickname is displayed in the lobby participant list. */
  async expectNicknameVisible(nickname: string) {
    await expect(this.page.getByText(nickname)).toBeVisible();
  }
}
