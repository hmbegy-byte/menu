# Flavor Flow

Project Guidelines:

1. Target Layout: Mobile-First interface optimized for restaurant QR ordering (Chipotle/Sweetgreen UI style).

2. RTL & Language: Default language is Arabic with `dir="rtl"` layout. Use 'Cairo' or 'Tajawal' Google Font.

3. Color System: Use Tailwind CSS variables for main accent/primary colors (e.g. `bg-primary`) to allow dynamic white-labeling from admin settings.

4. Component Structure:

   - Sticky top category navigation bar with active state indicator.

   - Interactive item modal for options/add-ons with live price calculator.

   - Smooth slide-up cart sheet with order summary and direct WhatsApp action button.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a142f4c6-6a47-445f-8e41-ad3b03275a38).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
