/*
 * Copyright (c) 2020 Cynthia K. Rey, All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { commentDiscussion } from '../icons/octicons'
import { fetchPronouns, fetchPronounsBulk } from '../util/fetch'
import { css, h } from '../util/dom'

function injectHoverCards () {
  const popover = document.querySelector('.js-hovercard-content > .Popover-message')
  const observer = new MutationObserver(
    async function () {
      const startHeight = popover.getBoundingClientRect().height
      const tracking = popover.querySelector('[data-hovercard-tracking]')?.dataset?.hovercardTracking
      const hv = popover.querySelector('[data-hydro-view]')?.dataset?.hydroView
      if (!tracking || !hv) return

      const { user_id: userId } = JSON.parse(tracking)
      const { event_type: type } = JSON.parse(hv)
      if (type !== 'user-hovercard-hover') return

      const block = popover.querySelector('.d-flex .overflow-hidden.ml-3')
      if (!block) return

      const pronouns = await fetchPronouns('github', String(userId))
      if (!pronouns) return

      const item = block.querySelector('.mt-2')
      if (item) item.remove()
      block.appendChild(
        h(
          'div',
          { style: css({ display: 'flex', alignItems: 'center' }) },
          item,
          h(
            'div',
            {
              class: 'mt-2 text-gray text-small',
              style: css({ marginTop: '8px !important', marginLeft: item ? '8px' : '0' })
            },
            commentDiscussion({ class: 'octicon' }),
            '\n  ',
            pronouns
          )
        )
      )

      if (popover.className.includes('Popover-message--bottom')) {
        const delta = popover.getBoundingClientRect().height - startHeight
        if (delta > 0) {
          popover.parentElement.style.top = `${parseInt(popover.parentElement.style.top) - delta}px`
        }
      }
    }
  )

  observer.observe(popover, { childList: true })
}

async function injectUserProfile () {
  const userId = document.querySelector('[data-scope-id]').dataset.scopeId
  const list = document.querySelector('.vcard-details')
  if (!userId || !list) return

  const pronouns = await fetchPronouns('github', userId)
  if (!pronouns) return

  list.appendChild(
    h(
      'li',
      {
        class: 'vcard-detail pt-1 css-truncate css-truncate-target hide-sm hide-md',
        itemprop: 'pronouns',
        show_title: false,
        'aria-label': `Pronouns: ${pronouns}`
      },
      commentDiscussion({ class: 'octicon' }),
      h('span', { class: 'p-label' }, pronouns)
    )
  )
}

async function injectProfileLists () {
  const items = Array.from(document.querySelectorAll('.user-profile-nav + div .d-table'))
  const ids = items.map(item => {
    const id = item.querySelector('img').src.match(/\/u\/(\d+)/)[1]
    item.dataset.userId = id
    return id
  })

  const pronouns = await fetchPronounsBulk('github', ids)
  for (const item of items) {
    if (pronouns[item.dataset.userId]) {
      const col = item.querySelector('.d-table-cell + .d-table-cell')
      let about = col.querySelector('.mb-0')
      const margin = Boolean(about)
      if (!about) {
        about = h('p', { class: 'text-gray text-small mb-0' })
        col.appendChild(about)
      }

      about.appendChild(
        h(
          'span',
          { class: margin ? 'ml-3' : '' },
          commentDiscussion({ class: 'octicon' }),
          '\n  ',
          pronouns[item.dataset.userId]
        )
      )
    }
  }
}

export function run () {
  injectHoverCards()
  if (document.querySelector('.user-profile-nav')) {
    injectUserProfile()

    const tab = new URLSearchParams(location.search).get('tab')
    if (tab === 'followers' || tab === 'following') {
      injectProfileLists()
    }
  }

  document.head.appendChild(
    h('style', null, '.js-hovercard-content .d-flex .overflow-hidden.ml-3 .mt-2 + .mt-2 { margin-top: 4px !important; }')
  )
}

export const match = /^https:\/\/(.+\.)?github\.com/
