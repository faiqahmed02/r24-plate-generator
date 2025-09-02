# R24 Plate Generator System

## Overview

The **R24 Plate Generator System** is a responsive web app for configuring
and visualizing custom wall plates.\
Each plate displays a portion of a shared motif image, updating in real
time when dimensions or layout change.\
Optimized for both desktop and mobile devices.

------------------------------------------------------------------------

## Features

-   Default plate generated on first load (state persisted in
    **localStorage**).
-   Add/remove up to **10 plates** (cannot go below 1).
-   Input custom dimensions (**20--300 cm width**, **30--128 cm
    height**).
-   Locale support for English and German (`.` and `,` decimal
    separators).
-   Real-time canvas preview (scales **1 cm = 1 px**).
-   Plates displayed **side by side**, no stretching.
-   Shared motif split across plates.
-   **Cropping from center outward** for aspect ratio mismatch.
-   **Horizontal mirroring** if layout width exceeds **300 cm**.
-   Touch and mobile friendly.

------------------------------------------------------------------------

## Setup Instructions

1.  **Clone repository**

    ``` bash
    git clone https://github.com/faiqahmed02/r24-plate-generator
    cd r24-plate-generator
    ```

2.  **Install dependencies**

    ``` bash
    npm install
    ```

3.  **Run development server**

    ``` bash
    npm run dev
    ```

4.  **Build for production**

    ``` bash
    npm run build
    npm run preview
    ```

------------------------------------------------------------------------

## Known Limitations / Assumptions

-   Default motif image is embedded; custom uploads optional.
-   Image extension is handled by **mirroring** beyond 300 cm, not
    tiling.
-   Performance optimized for canvas-based preview; large images may
    cause slowdown on very low-end devices.
-   Export currently only supports **PNG snapshots** (if implemented).

------------------------------------------------------------------------

## Screenshots & Demo Video

*(Replace with actual media)*

-   **Screenshot 1:** Initial view with single plate\
-   **Screenshot 2:** Multiple plates with motif applied\
-   **Demo Video:** [Link to demo](https://www.dropbox.com/scl/fi/316vazirf1fkrig2ia76l/Screen-Recording-2025-09-02-at-3.14.12-PM.mov?rlkey=ge446iv60pvd1yvvw69n2g6tb&st=jg9tuls4&dl=0)

------------------------------------------------------------------------

## Tech Stack

-   React + Vite
-   TypeScript
-   Canvas 2D API
-   LocalStorage persistence

------------------------------------------------------------------------

## Evaluation Notes

This implementation prioritizes: - **Accurate scaling** (1 cm = 1 px) -
**Real-time updates** - **Error handling with styled messages** -
**Responsive, mobile-friendly design**

------------------------------------------------------------------------
