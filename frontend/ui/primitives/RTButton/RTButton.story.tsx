// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * RTButton Story
 * 
 * Static isolated demo of Button component in various states and variants.
 * This file serves as a visual reference for component behavior.
 */

import { Button } from "./RTButton.template";

export default function ButtonStory() {
  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h3>Solid (Default)</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button>Solid Green (default)</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3>Solid Colors</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button className="solid green">Solid Green</Button>
          <Button className="solid grey">Solid Grey</Button>
          <Button className="solid red">Solid Red</Button>
          <Button className="solid yellow">Solid Yellow</Button>
        </div>
      </div>

      <div>
        <h3>Outlined</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button className="outlined green">Outlined Green</Button>
          <Button className="outlined grey">Outlined Grey</Button>
          <Button className="outlined red">Outlined Red</Button>
          <Button className="outlined yellow">Outlined Yellow</Button>
        </div>
      </div>

      <div>
        <h3>Ghost</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button className="ghost green">Ghost Green</Button>
          <Button className="ghost grey">Ghost Grey</Button>
          <Button className="ghost red">Ghost Red</Button>
          <Button className="ghost yellow">Ghost Yellow</Button>
        </div>
      </div>

      <div>
        <h3>Bold Variants</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button className="bold">Bold Solid Green</Button>
          <Button className="outlined grey bold">Bold Outlined Grey</Button>
          <Button className="ghost red bold">Bold Ghost Red</Button>
        </div>
      </div>

      <div>
        <h3>Disabled States</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button disabled>Disabled Solid</Button>
          <Button className="outlined" disabled>
            Disabled Outlined
          </Button>
          <Button className="ghost" disabled>
            Disabled Ghost
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ButtonVariants() {
  return (
    <div style={{ padding: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <Button>Default</Button>
      <Button className="outlined grey">Outlined</Button>
      <Button className="ghost red">Ghost</Button>
      <Button className="bold yellow">Bold</Button>
      <Button disabled>Disabled</Button>
    </div>
  );
}
