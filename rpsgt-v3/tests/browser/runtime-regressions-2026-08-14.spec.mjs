import {test,expect} from '@playwright/test';

test('shared learning library renders in Flashcards and Math Coach without Failed to fetch',async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-card-stage]')).toBeVisible();
  await expect(page.locator('[data-card-total]')).toHaveText('312 cards');
  await expect(page.getByText('Flashcard Center could not load')).toHaveCount(0);
  await expect(page.getByText('Failed to fetch')).toHaveCount(0);

  await page.goto('math-coach.html');
  await expect(page.locator('[data-math-library-count]')).toHaveText('20 lessons · 100 practice questions');
  await expect(page.locator('[data-math-library-list] .math-lesson-button')).toHaveCount(20);
  await expect(page.getByText('Lesson library could not load')).toHaveCount(0);
  await expect(page.getByText('Failed to fetch')).toHaveCount(0);
});

test('Practice Modes and Mock-Style Exam remain separate Launchpad destinations',async({page})=>{
  await page.goto('practice.html');

  const practiceLink=page.locator('.sidebar a[href="practice.html"]').filter({hasText:'Practice Modes'});
  const mockLink=page.locator('.sidebar a[href="mock.html"]').filter({hasText:'Mock-Style Exam'});

  await expect(practiceLink).toHaveClass(/active/);
  await expect(practiceLink).toHaveAttribute('aria-current','page');
  await expect(mockLink).not.toHaveClass(/active/);

  // Navigate directly so this route-identity regression remains valid when the
  // responsive sidebar is intentionally collapsed on tablet and mobile.
  await page.goto('mock.html');
  await expect(page).toHaveURL(/mock\.html/);

  const mockPracticeLink=page.locator('.sidebar a[href="practice.html"]').filter({hasText:'Practice Modes'});
  const activeMockLink=page.locator('.sidebar a[href="mock.html"]').filter({hasText:'Mock-Style Exam'});
  await expect(activeMockLink).toHaveClass(/active/);
  await expect(activeMockLink).toHaveAttribute('aria-current','page');
  await expect(mockPracticeLink).not.toHaveClass(/active/);

  await page.goto('practice.html');
  await expect(page).toHaveURL(/practice\.html/);
  await expect(page.locator('.sidebar a[href="practice.html"]').filter({hasText:'Practice Modes'})).toHaveClass(/active/);
  await expect(page.locator('.sidebar a[href="mock.html"]').filter({hasText:'Mock-Style Exam'})).not.toHaveClass(/active/);
});
