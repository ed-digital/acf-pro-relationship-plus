/** @jsx jsx */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { selectable, Selectable } from './utils/seletable'
import { jsx, css } from '@emotion/core'

let store = selectable({
  title: '',
  open: false,
  /* Used for the notification panel */
  focused: null,
  searchInput: null,
  loading: false,
  postType: 'post',
  postTypeOptions: [],
  error: false,
  notifications: [],
})

store.select(
  (s) => s.open,
  (open) => {
    if (!open) {
      store.set((s) => {
        s.error = false
      })

      acf?.getFields({ type: 'relationship' }).forEach((field) => {
        field.fetch()
      })
    }
  }
)

// @ts-ignore
let acf = window.acf

const modalStyles = css`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  font-size: 13px;

  .custom-shade {
    backdrop-filter: blur(4px);
    background: rgba(130, 130, 130, 0.3);
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  form {
    width: 100%;
  }

  .modal {
    position: relative;
    max-width: 500px;
    background: white;
    margin: 0 auto;
    margin-top: 25vh;
    padding: 20px;
    display: flex;
    overflow: hidden;
    box-shadow: 0px 16px 25px 0px rgba(120, 120, 120, 0.2);

    .title {
      margin: 0;
      margin-bottom: 0.5em;
    }

    input,
    select {
      width: 100%;
      margin-right: 0;
      max-width: 100%;
    }

    .scroller {
      padding-bottom: 31px;
    }

    footer {
      position: absolute;
      height: 30px;
      left: 0;
      padding: 10px 20px;
      right: 0;
      bottom: 0;
      background: white;
      background: rgba(0, 0, 0, 0.04);
      border-top: solid 1px rgba(0, 0, 0, 0.09);

      input[type='submit'] {
        width: 100%;
      }
    }
  }
`

async function submitPost() {
  let s = store.state()

  console.log('submit')

  store.set((s) => {
    s.loading = true
  })

  let { error, message, data } = await new Promise((resolve) =>
    window.jQuery.ajax({
      type: 'post',
      dataType: 'json',
      url: window.ajaxurl,
      data: {
        action: 'acf_pro_relationship_plus_submit',
        title: s.title,
        type: s.postType,
      },
      complete: resolve,
    })
  )

  store.set((s) => {
    s.loading = false
    s.open = false
    s.error = false
    s.searchInput = null
    s.focused = false
    s.postType = ''
    if (error) {
      s.error = message
    }
  })

  console.log({ error, message, data })
}

let MODAL_CONTAINER

function useSelectable<V>(
  selectable: Selectable<V>,
  selector: (arg: V) => any
) {
  let [state, set] = useState(selector(selectable.state()))
  useEffect(() => {
    set(selector(selectable.state()))
    selectable.select(selector, set)
  })
  return state
}

function FocusOnMount({ children }) {
  return (
    <div
      ref={(el) => {
        if (el) {
          el.querySelector('input').focus()
        }
      }}
    >
      {children}
    </div>
  )
}

let ALL_OPTIONS = []
window.ALL_OPTIONS = ALL_OPTIONS

function Modal() {
  let open = useSelectable(store, (s) => s.open)
  let title = useSelectable(store, (s) => s.title)
  let postType = useSelectable(store, (s) => s.postType)
  let postTypeOptions = useSelectable(store, (s) => s.postTypeOptions)
  let loading = useSelectable(store, (s) => s.loading)
  let err = useSelectable(store, (s) => s.error)

  if (!open) {
    return null
  }

  if (!ALL_OPTIONS) {
    ALL_OPTIONS =
      Object.keys(
        parse(
          document.querySelector('[data-all-post-types]').textContent.trim()
        )
      ) || []
  }

  return (
    <div css={modalStyles}>
      <div
        className="custom-shade"
        onClick={(e) =>
          store.set((s) => {
            s.open = false
          })
        }
      />
      <div className="modal">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitPost()
          }}
        >
          <div className="scroller">
            <h3 className="title">Add new {makeTitle(postType)}</h3>
            {err && <p className="wp-notice warn">{err}</p>}
            <div className="acf-field">
              <div className="acf-label">
                <label htmlFor="create-title">Title</label>
              </div>
              <FocusOnMount>
                <input
                  id="create-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    store.set((s) => {
                      s.title = e.target.value
                    })
                  }}
                />
              </FocusOnMount>
            </div>
            {postTypeOptions.length !== 1 && (
              <div className="acf-field">
                <div className="acf-label">
                  <label htmlFor="create-title">Type</label>
                </div>
                <select
                  name="postType"
                  value={postType}
                  onChange={(e) => {
                    store.set((s) => {
                      s.postType = e.target.value
                    })
                  }}
                >
                  {(postTypeOptions.length === 0
                    ? ALL_OPTIONS
                    : postTypeOptions
                  ).map((opt, i) => {
                    return (
                      <option key={i} value={opt}>
                        {makeTitle(opt)}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
          </div>
          <footer>
            <input
              disabled={!title || loading}
              className="submit button button-primary"
              type="submit"
              name="submit"
              value="Submit"
              onClick={(e) => {
                e.preventDefault()
                submitPost()
              }}
            />
          </footer>
        </form>
      </div>
    </div>
  )
}

function CreateButton({ container, search, postTypes }) {
  let focused = useSelectable(store, (s) => s.focused)
  let postType = useSelectable(store, (s) => s.postType)
  let currentTitle = useSelectable(search, (s) => s.search)

  return (
    <div
      className="acf-toolbar"
      css={css`
        padding: 10px 0px 0px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        button {
          margin-top: 20px;
          display: block;
        }

        code {
          font-size: 10px;
          line-height: 1;
          margin-right: 5px;
        }

        small {
          font-size: 12px;
        }
      `}
    >
      <button
        className="button button-primary"
        onClick={(e) => {
          e.preventDefault()
          store.set((s) => {
            s.open = true
          })
        }}
      >
        Create {currentTitle ? '' : 'new '}
        <strong>{currentTitle || makeTitle(postTypes[0])}</strong>
      </button>
      <small>
        <code>Ctrl + N</code>
        to create a new post
      </small>
    </div>
  )
}

/**
 * Perform some stuff on Relationship & Post Object fields
 * as soon as they are created
 */
function on_acf_relationship_field_ready($el, field_type) {
  console.log($el, field_type)
}

function onCreate() {
  if (!MODAL_CONTAINER) {
    MODAL_CONTAINER = document.createElement('div')
    document.body.append(MODAL_CONTAINER)

    render(<Modal />, MODAL_CONTAINER)

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        store.set((s) => {
          s.open = !s.open
        })
      } else if (e.key === 'Escape' && store.state().open) {
        e.preventDefault()
        store.set((s) => {
          s.open = false
        })
      }
    })
  }
}

function mountRelationship($el) {
  let field = acf.getField($el)
  onCreate()

  let searchField = field.$el.find('[data-filter="s"]')
  let container = document.createElement('div')

  field.$el.append(container)

  let data = parse(field.$el.find('[data-post-types]').get(0)?.innerText)

  let search = selectable({ search: searchField.val() })

  function focusInside() {
    store.set((s) => {
      s.postTypeOptions = data
      s.postType = data[0]
      s.title = search.state().search
      s.focused = container
      s.searchInput = searchField.get(0)
    })
  }

  field.$el.on('focusin', () => {
    focusInside()
  })

  searchField.on('input', (e) => {
    search.set((s) => {
      s.search = e.target.value
    })
    store.set((s) => {
      s.title = e.target.value
    })
  })

  render(
    <CreateButton container={container} postTypes={data} search={search} />,
    container
  )
}

window.jQuery(() => {
  acf.add_action('load_field/type=relationship', function ($el) {
    mountRelationship($el)
  })

  acf.add_action('append_field/type=relationship', function ($el) {
    mountRelationship($el)
  })

  // Post Object fields
  acf.add_action('load_field/type=post_object', function ($el) {
    on_acf_relationship_field_ready($el, 'post_object')
  })
  acf.add_action('append_field/type=post_object', function ($el) {
    on_acf_relationship_field_ready($el, 'post_object')
  })
})

function parse(str) {
  try {
    return JSON.parse(str)
  } catch (err) {
    return false
  }
}

function makeTitle(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
