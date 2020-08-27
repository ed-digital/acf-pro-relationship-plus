/** @jsx jsx */
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { selectable } from './utils/seletable'
import { jsx, css } from '@emotion/core'
import uid from 'uid'

let acfProRelationshipPlus = selectable({
  title: false,
  createdPosts: [],
})

// @ts-ignore
window.acfProRelationshipPlus = acfProRelationshipPlus

const shadeStyles = css`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`

function mount(container) {
  render(<Modal />, container)

  function unmount() {
    unmountComponentAtNode(container)
  }

  function Modal() {
    return (
      <React.Fragment>
        <div css={shadeStyles} onClick={(e) => unmount()} />
        <div
          css={css`
            max-width: 500px;
            min-height: 50vh;
          `}
        >
          Modal
        </div>
      </React.Fragment>
    )
  }
}

/**
 * Perform some stuff on Relationship & Post Object fields
 * as soon as they are created
 */
function on_acf_relationship_field_ready($el, field_type) {
  var $link = $el.find('a.acf-relationship-create-link')
  if ($link.length !== 1) return

  // Add a unique ID for the field
  $el.attr('data-acf-rc-uniqid', uid())

  console.log($el)
}

window.acf.add_action('load_field/type=relationship', function ($el) {
  on_acf_relationship_field_ready($el, 'relationship')
})

window.acf.add_action('append_field/type=relationship', function ($el) {
  on_acf_relationship_field_ready($el, 'relationship')
})

// Post Object fields
wdinow.acf.add_action('load_field/type=post_object', function ($el) {
  on_acf_relationship_field_ready($el, 'post_object')
})
window.acf.add_action('append_field/type=post_object', function ($el) {
  on_acf_relationship_field_ready($el, 'post_object')
})
