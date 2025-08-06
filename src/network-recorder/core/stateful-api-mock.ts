/**
 * Stateful API mock for CRUD operations
 *
 * This replaces HAR-based playback with a smarter approach that understands
 * API semantics and maintains state across requests.
 */

import type { BrowserContext, Route } from '@playwright/test'
import { log } from '../../log'

interface Movie {
  id: number
  name: string
  year: number
  rating: number
  director: string
}

interface ApiState {
  movies: Movie[]
  nextId: number
}

export class StatefulApiMock {
  private state: ApiState = {
    movies: [],
    nextId: 1
  }

  /**
   * Reset state to initial conditions
   */
  reset(): void {
    this.state = {
      movies: [],
      nextId: 1
    }
  }

  /**
   * Set up route handlers on the browser context
   */
  async setup(context: BrowserContext): Promise<void> {
    await log.debug('🎭 Setting up stateful API mock')

    // Handle all /movies routes
    await context.route('**/movies/**', async (route) =>
      this.handleRoute(route)
    )
    await context.route('**/movies', async (route) => this.handleRoute(route))
  }

  private async handleRoute(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname

    await log.debug(
      `🎯 Stateful mock handling ${method} ${path} (full URL: ${request.url()})`
    )

    try {
      // Handle different endpoints
      if (path === '/movies' && method === 'GET') {
        await this.handleGetMovies(route)
      } else if (path === '/movies' && method === 'POST') {
        await this.handlePostMovie(route)
      } else if (path.match(/^\/movies\/\d+$/) && method === 'GET') {
        await this.handleGetMovie(route)
      } else if (path.match(/^\/movies\/\d+$/) && method === 'PUT') {
        await this.handlePutMovie(route)
      } else if (path.match(/^\/movies\/\d+$/) && method === 'DELETE') {
        await this.handleDeleteMovie(route)
      } else {
        // Unknown route - let it continue
        await route.continue()
      }
    } catch (error) {
      await log.error(`Stateful mock error: ${error}`)
      await route.abort()
    }
  }

  private async handleGetMovies(route: Route): Promise<void> {
    await log.debug(`  Returning ${this.state.movies.length} movies`)
    if (this.state.movies.length > 0) {
      await log.debug(`  Movies: ${JSON.stringify(this.state.movies)}`)
    }
    await this.respond(route, 200, this.state.movies)
  }

  private async handlePostMovie(route: Route): Promise<void> {
    const data = JSON.parse(route.request().postData() || '{}')
    const newMovie: Movie = {
      id: this.state.nextId++,
      name: data.name,
      year: data.year,
      rating: data.rating,
      director: data.director
    }

    this.state.movies.push(newMovie)
    await log.debug(`  Created movie: ${newMovie.name} (id: ${newMovie.id})`)
    await this.respond(route, 200, newMovie)
  }

  private async handleGetMovie(route: Route): Promise<void> {
    const id = this.extractId(route.request().url())
    const movie = this.state.movies.find((m) => m.id === id)

    if (movie) {
      await log.debug(`  Found movie: ${movie.name}`)
      await this.respond(route, 200, movie)
    } else {
      await log.debug(`  Movie not found: ${id}`)
      await this.respond(route, 404, { error: 'Movie not found' })
    }
  }

  private async handlePutMovie(route: Route): Promise<void> {
    const id = this.extractId(route.request().url())
    const data = JSON.parse(route.request().postData() || '{}')
    const index = this.state.movies.findIndex((m) => m.id === id)

    if (index !== -1) {
      this.state.movies[index] = { ...this.state.movies[index]!, ...data }
      await log.debug(`  Updated movie: ${this.state.movies[index]!.name}`)
      await this.respond(route, 200, this.state.movies[index])
    } else {
      await log.debug(`  Movie not found for update: ${id}`)
      await this.respond(route, 404, { error: 'Movie not found' })
    }
  }

  private async handleDeleteMovie(route: Route): Promise<void> {
    const id = this.extractId(route.request().url())
    const index = this.state.movies.findIndex((m) => m.id === id)

    if (index !== -1) {
      const deleted = this.state.movies.splice(index, 1)[0]!
      await log.debug(`  Deleted movie: ${deleted.name}`)
      await this.respond(route, 200, { message: 'Movie deleted' })
    } else {
      await log.debug(`  Movie not found for deletion: ${id}`)
      await this.respond(route, 404, { error: 'Movie not found' })
    }
  }

  private extractId(url: string): number {
    const match = url.match(/\/movies\/(\d+)/)
    return match ? parseInt(match[1]!, 10) : 0
  }

  private async respond(
    route: Route,
    status: number,
    data: unknown
  ): Promise<void> {
    // Match the backend's response format
    const responseBody = {
      status,
      data
    }

    // Get the origin from the request headers to support cross-environment playback
    const request = route.request()
    const origin = request.headers()['origin'] || '*'

    await route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true'
      },
      body: JSON.stringify(responseBody)
    })
  }
}

/**
 * Create a stateful API mock instance
 */
export function createStatefulApiMock(): StatefulApiMock {
  return new StatefulApiMock()
}
