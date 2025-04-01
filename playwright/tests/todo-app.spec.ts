import { test, expect, type Page } from '@playwright/test'
import { log, methodTestStep, functionTestStep } from '../../src/log'

test.beforeEach(async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc')
})

const TODO_ITEMS = [
  'buy some cheese',
  'feed the cat',
  'book a doctors appointment'
] as const

test.describe('New Todo', () => {
  test('should allow me to add todo items', async ({ page }) => {
    log.step('Testing adding todo items')

    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    log.step('Add first todo')
    // Create 1st todo.
    await newTodo.fill(TODO_ITEMS[0])
    await newTodo.press('Enter')

    // Make sure the list only has one todo item.
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0]])
    log.success('First todo added and verified')

    log.step('Add second todo')
    // Create 2nd todo.
    await newTodo.fill(TODO_ITEMS[1])
    await newTodo.press('Enter')

    // Make sure the list now has two todo items.
    await expect(page.getByTestId('todo-title')).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[1]
    ])
    log.success('Second todo added and verified')

    await checkNumberOfTodosInLocalStorage(page, 2)
  })

  test('should allow me to add todo items (using Page Object)', async ({
    page
  }) => {
    log.step('Testing adding todo items with Page Object')

    // Create a TodoPage instance
    const todoPage = new TodoPage(page)

    log.step('Add first todo with page object')
    // Use the decorated addTodo method
    await todoPage.addTodo(TODO_ITEMS[0])

    // Use the decorated getTodos method
    const firstTodos = await todoPage.getTodos()
    await expect(firstTodos).toHaveText([TODO_ITEMS[0]])
    log.success('First todo added and verified')

    log.step('Add second todo with page object')
    await todoPage.addTodo(TODO_ITEMS[1])

    // Use the decorated getTodos method again
    const secondTodos = await todoPage.getTodos()
    await expect(secondTodos).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]])
    log.success('Second todo added and verified')

    await checkNumberOfTodosInLocalStorage(page, 2)
  })

  test('should clear text input field when an item is added', async ({
    page
  }) => {
    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    // Create one todo item.
    await newTodo.fill(TODO_ITEMS[0])
    await newTodo.press('Enter')

    // Check that input is empty.
    await expect(newTodo).toBeEmpty()
    await checkNumberOfTodosInLocalStorage(page, 1)
  })

  test('should append new items to the bottom of the list', async ({
    page
  }) => {
    // Create 3 items.
    await createDefaultTodos(page)

    // create a todo count locator
    const todoCount = page.getByTestId('todo-count')

    // Check test using different methods.
    await expect(page.getByText('3 items left')).toBeVisible()
    await expect(todoCount).toHaveText('3 items left')
    await expect(todoCount).toContainText('3')
    await expect(todoCount).toHaveText(/3/)

    // Check all items in one call.
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS)
    await checkNumberOfTodosInLocalStorage(page, 3)
  })
})

test.describe('Mark all as completed', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page)
    await checkNumberOfTodosInLocalStorage(page, 3)
  })

  test.afterEach(async ({ page }) => {
    await checkNumberOfTodosInLocalStorage(page, 3)
  })

  test('should allow me to mark all items as completed', async ({ page }) => {
    log.step('Testing marking all todos as completed')

    // Toggle all items as completed
    await page.getByLabel('Mark all as complete').check()

    // Ensure all todos have 'completed' class
    await expect(page.getByTestId('todo-item')).toHaveClass([
      'completed',
      'completed',
      'completed'
    ])
    log.success('All todos have completed class')

    await checkNumberOfCompletedTodosInLocalStorage(page, 3)
  })

  test('should allow me to mark all items as completed (using Page Object)', async ({
    page
  }) => {
    log.step('Testing marking all todos as completed with Page Object')

    // Create a TodoPage instance
    const todoPage = new TodoPage(page)

    log.step('Mark all todos as complete with page object')
    // Use the decorated toggleAllCompleted method
    await todoPage.toggleAllCompleted(true)

    // Ensure all todos have 'completed' class
    await expect(page.getByTestId('todo-item')).toHaveClass([
      'completed',
      'completed',
      'completed'
    ])
    log.success('All todos have completed class')

    await checkNumberOfCompletedTodosInLocalStorage(page, 3)
  })

  test('should allow me to clear the complete state of all items', async ({
    page
  }) => {
    const toggleAll = page.getByLabel('Mark all as complete')
    // Check and then immediately uncheck.
    await toggleAll.check()
    await toggleAll.uncheck()

    // Should be no completed classes.
    await expect(page.getByTestId('todo-item')).toHaveClass(['', '', ''])
  })

  test('complete all checkbox should update state when items are completed / cleared', async ({
    page
  }) => {
    const toggleAll = page.getByLabel('Mark all as complete')
    await toggleAll.check()
    await expect(toggleAll).toBeChecked()
    await checkNumberOfCompletedTodosInLocalStorage(page, 3)

    // Uncheck first todo.
    const firstTodo = page.getByTestId('todo-item').nth(0)
    await firstTodo.getByRole('checkbox').uncheck()

    // Reuse toggleAll locator and make sure its not checked.
    await expect(toggleAll).not.toBeChecked()

    await firstTodo.getByRole('checkbox').check()
    await checkNumberOfCompletedTodosInLocalStorage(page, 3)

    // Assert the toggle all is checked again.
    await expect(toggleAll).toBeChecked()
  })
})

test.describe('Item', () => {
  test('should allow me to mark items as complete', async ({ page }) => {
    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    // Create two items.
    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item)
      await newTodo.press('Enter')
    }

    // Check first item.
    const firstTodo = page.getByTestId('todo-item').nth(0)
    await firstTodo.getByRole('checkbox').check()
    await expect(firstTodo).toHaveClass('completed')

    // Check second item.
    const secondTodo = page.getByTestId('todo-item').nth(1)
    await expect(secondTodo).not.toHaveClass('completed')
    await secondTodo.getByRole('checkbox').check()

    // Assert completed class.
    await expect(firstTodo).toHaveClass('completed')
    await expect(secondTodo).toHaveClass('completed')
  })

  test('should allow me to un-mark items as complete', async ({ page }) => {
    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    // Create two items.
    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item)
      await newTodo.press('Enter')
    }

    const firstTodo = page.getByTestId('todo-item').nth(0)
    const secondTodo = page.getByTestId('todo-item').nth(1)
    const firstTodoCheckbox = firstTodo.getByRole('checkbox')

    await firstTodoCheckbox.check()
    await expect(firstTodo).toHaveClass('completed')
    await expect(secondTodo).not.toHaveClass('completed')
    await checkNumberOfCompletedTodosInLocalStorage(page, 1)

    await firstTodoCheckbox.uncheck()
    await expect(firstTodo).not.toHaveClass('completed')
    await expect(secondTodo).not.toHaveClass('completed')
    await checkNumberOfCompletedTodosInLocalStorage(page, 0)
  })

  test('should allow me to edit an item', async ({ page }) => {
    await createDefaultTodos(page)

    const todoItems = page.getByTestId('todo-item')
    const secondTodo = todoItems.nth(1)
    await secondTodo.dblclick()
    await expect(secondTodo.getByRole('textbox', { name: 'Edit' })).toHaveValue(
      TODO_ITEMS[1]
    )
    await secondTodo
      .getByRole('textbox', { name: 'Edit' })
      .fill('buy some sausages')
    await secondTodo.getByRole('textbox', { name: 'Edit' }).press('Enter')

    // Explicitly assert the new text value.
    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2]
    ])
    await checkTodosInLocalStorage(page, 'buy some sausages')
  })
})

test.describe('Editing', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page)
    await checkNumberOfTodosInLocalStorage(page, 3)
  })

  test('should hide other controls when editing', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item').nth(1)
    await todoItem.dblclick()
    await expect(todoItem.getByRole('checkbox')).not.toBeVisible()
    await expect(
      todoItem.locator('label', {
        hasText: TODO_ITEMS[1]
      })
    ).not.toBeVisible()
    await checkNumberOfTodosInLocalStorage(page, 3)
  })

  test('should save edits on blur', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item')
    await todoItems.nth(1).dblclick()
    await todoItems
      .nth(1)
      .getByRole('textbox', { name: 'Edit' })
      .fill('buy some sausages')
    await todoItems
      .nth(1)
      .getByRole('textbox', { name: 'Edit' })
      .dispatchEvent('blur')

    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2]
    ])
    await checkTodosInLocalStorage(page, 'buy some sausages')
  })

  test('should trim entered text', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item')
    await todoItems.nth(1).dblclick()
    await todoItems
      .nth(1)
      .getByRole('textbox', { name: 'Edit' })
      .fill('    buy some sausages    ')
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter')

    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2]
    ])
    await checkTodosInLocalStorage(page, 'buy some sausages')
  })

  test('should remove the item if an empty text string was entered', async ({
    page
  }) => {
    const todoItems = page.getByTestId('todo-item')
    await todoItems.nth(1).dblclick()
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).fill('')
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter')

    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]])
  })

  test('should cancel edits on escape', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item')
    await todoItems.nth(1).dblclick()
    await todoItems
      .nth(1)
      .getByRole('textbox', { name: 'Edit' })
      .fill('buy some sausages')
    await todoItems
      .nth(1)
      .getByRole('textbox', { name: 'Edit' })
      .press('Escape')
    await expect(todoItems).toHaveText(TODO_ITEMS)
  })
})

test.describe('Counter', () => {
  test('should display the current number of todo items', async ({ page }) => {
    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    // create a todo count locator
    const todoCount = page.getByTestId('todo-count')

    await newTodo.fill(TODO_ITEMS[0])
    await newTodo.press('Enter')

    await expect(todoCount).toContainText('1')

    await newTodo.fill(TODO_ITEMS[1])
    await newTodo.press('Enter')
    await expect(todoCount).toContainText('2')

    await checkNumberOfTodosInLocalStorage(page, 2)
  })
})

test.describe('Clear completed button', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page)
  })

  test('should display the correct text', async ({ page }) => {
    await page.locator('.todo-list li .toggle').first().check()
    await expect(
      page.getByRole('button', { name: 'Clear completed' })
    ).toBeVisible()
  })

  test('should remove completed items when clicked', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item')
    await todoItems.nth(1).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Clear completed' }).click()
    await expect(todoItems).toHaveCount(2)
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]])
  })

  test('should be hidden when there are no items that are completed', async ({
    page
  }) => {
    await page.locator('.todo-list li .toggle').first().check()
    await page.getByRole('button', { name: 'Clear completed' }).click()
    await expect(
      page.getByRole('button', { name: 'Clear completed' })
    ).toBeHidden()
  })
})

test.describe('Persistence', () => {
  test('should persist its data', async ({ page }) => {
    // create a new todo locator
    const newTodo = page.getByPlaceholder('What needs to be done?')

    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item)
      await newTodo.press('Enter')
    }

    const todoItems = page.getByTestId('todo-item')
    const firstTodoCheck = todoItems.nth(0).getByRole('checkbox')
    await firstTodoCheck.check()
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]])
    await expect(firstTodoCheck).toBeChecked()
    await expect(todoItems).toHaveClass(['completed', ''])

    // Ensure there is 1 completed item.
    await checkNumberOfCompletedTodosInLocalStorage(page, 1)

    // Now reload.
    await page.reload()
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]])
    await expect(firstTodoCheck).toBeChecked()
    await expect(todoItems).toHaveClass(['completed', ''])
  })
})

test.describe('Routing', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page)
    // make sure the app had a chance to save updated todos in storage
    // before navigating to a new view, otherwise the items can get lost :(
    // in some frameworks like Durandal
    await checkTodosInLocalStorage(page, TODO_ITEMS[0])
  })

  test('should allow me to display active items', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item')
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check()

    await checkNumberOfCompletedTodosInLocalStorage(page, 1)
    await page.getByRole('link', { name: 'Active' }).click()
    await expect(todoItem).toHaveCount(2)
    await expect(todoItem).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]])
  })

  test('should respect the back button', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item')
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check()

    await checkNumberOfCompletedTodosInLocalStorage(page, 1)

    await test.step('Showing all items', async () => {
      await page.getByRole('link', { name: 'All' }).click()
      await expect(todoItem).toHaveCount(3)
    })

    await test.step('Showing active items', async () => {
      await page.getByRole('link', { name: 'Active' }).click()
    })

    await test.step('Showing completed items', async () => {
      await page.getByRole('link', { name: 'Completed' }).click()
    })

    await expect(todoItem).toHaveCount(1)
    await page.goBack()
    await expect(todoItem).toHaveCount(2)
    await page.goBack()
    await expect(todoItem).toHaveCount(3)
  })

  test('should allow me to display completed items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check()
    await checkNumberOfCompletedTodosInLocalStorage(page, 1)
    await page.getByRole('link', { name: 'Completed' }).click()
    await expect(page.getByTestId('todo-item')).toHaveCount(1)
  })

  test('should allow me to display all items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check()
    await checkNumberOfCompletedTodosInLocalStorage(page, 1)
    await page.getByRole('link', { name: 'Active' }).click()
    await page.getByRole('link', { name: 'Completed' }).click()
    await page.getByRole('link', { name: 'All' }).click()
    await expect(page.getByTestId('todo-item')).toHaveCount(3)
  })

  test('should highlight the currently applied filter', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'All' })).toHaveClass(
      'selected'
    )

    //create locators for active and completed links
    const activeLink = page.getByRole('link', { name: 'Active' })
    const completedLink = page.getByRole('link', { name: 'Completed' })
    await activeLink.click()

    // Page change - active items.
    await expect(activeLink).toHaveClass('selected')
    await completedLink.click()

    // Page change - completed items.
    await expect(completedLink).toHaveClass('selected')
  })
})

/**
 * TodoPage class with decorated methods for better test organization
 */
class TodoPage {
  constructor(private page: Page) {
    this.name = 'TodoPage'
  }

  // Name property for logging in steps
  readonly name: string

  /**
   * Adds a new todo item
   */
  @methodTestStep('Add todo item')
  async addTodo(text: string) {
    log.info(`Adding todo: ${text}`)
    const newTodo = this.page.getByPlaceholder('What needs to be done?')
    await newTodo.fill(text)
    await newTodo.press('Enter')
    log.success(`Added todo: ${text}`)
  }

  /**
   * Gets all todo items
   */
  @methodTestStep('Get all todos')
  async getTodos() {
    log.info('Getting all todos')
    return this.page.getByTestId('todo-title')
  }

  /**
   * Marks a todo as completed by index
   */
  @methodTestStep('Complete todo')
  async completeTodo(index: number) {
    log.info(`Marking todo #${index} as complete`)
    const todoItem = this.page.getByTestId('todo-item').nth(index)
    await todoItem.getByRole('checkbox').check()
    log.success(`Todo #${index} marked as complete`)
  }

  /**
   * Edits a todo item
   */
  @methodTestStep('Edit todo')
  async editTodo(index: number, newText: string) {
    log.info(`Editing todo #${index} to: ${newText}`)
    const todoItem = this.page.getByTestId('todo-item').nth(index)
    await todoItem.dblclick()
    await todoItem.getByRole('textbox', { name: 'Edit' }).fill(newText)
    await todoItem.getByRole('textbox', { name: 'Edit' }).press('Enter')
    log.success(`Edited todo #${index}`)
  }

  /**
   * Toggles all todos completion state
   */
  @methodTestStep('Toggle all completion')
  async toggleAllCompleted(completed: boolean) {
    log.info(`Setting all todos completion to: ${completed}`)
    const toggleAll = this.page.getByLabel('Mark all as complete')
    if (completed) {
      await toggleAll.check()
    } else {
      await toggleAll.uncheck()
    }
    log.success(`All todos toggled to ${completed ? 'completed' : 'active'}`)
  }
}

// Convert utility functions to use step decorators
const createDefaultTodos = functionTestStep(
  'Create default todos',
  async (page: Page) => {
    log.info('Creating default todos')
    const todoPage = new TodoPage(page)

    for (const item of TODO_ITEMS) {
      await todoPage.addTodo(item)
    }

    log.success('Created all default todos')
  }
)

const checkNumberOfTodosInLocalStorage = functionTestStep(
  'Check total todos count',
  async (page: Page, expected: number) => {
    log.info(`Verifying todo count: ${expected}`)
    const result = await page.waitForFunction((e) => {
      return JSON.parse(localStorage['react-todos']).length === e
    }, expected)
    log.success(`Verified todo count: ${expected}`)
    return result
  }
)

const checkNumberOfCompletedTodosInLocalStorage = functionTestStep(
  'Check completed todos count',
  async (page: Page, expected: number) => {
    log.info(`Verifying completed todo count: ${expected}`)
    const result = await page.waitForFunction((e) => {
      return (
        JSON.parse(localStorage['react-todos']).filter(
          (todo: any) => todo.completed
        ).length === e
      )
    }, expected)
    log.success(`Verified completed todo count: ${expected}`)
    return result
  }
)

const checkTodosInLocalStorage = functionTestStep(
  'Check todo exists',
  async (page: Page, title: string) => {
    log.info(`Verifying todo exists: ${title}`)
    const result = await page.waitForFunction((t) => {
      return JSON.parse(localStorage['react-todos'])
        .map((todo: any) => todo.title)
        .includes(t)
    }, title)
    log.success(`Verified todo exists: ${title}`)
    return result
  }
)
