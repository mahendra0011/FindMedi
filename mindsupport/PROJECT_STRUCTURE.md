# MindSupport Project Structure

```text
mindSupport-main/
  backend/
    server.js                    # Node entrypoint
    .env.example                 # MongoDB-only backend env example
    scripts/
      create-admin.js            # Manual admin account creation
      seed-resources.js          # Manual resource seed runner for Atlas/Render data
      seed-counsellors.js        # Manual approved counsellor seed runner
      seed-all.js                # Full MongoDB Atlas/Render seed runner
    src/
      app.js                     # Express app assembly and shared helpers
      config/
        env.js                   # Environment variables
      database/
        connect.js               # MongoDB connection lifecycle
        seed.js                  # Idempotent collection and launch-data seeding
      models/
        index.js                 # Mongoose schemas/models
      realtime/
        socket.js                # Socket.io JWT auth and rooms
      routes/
        index.js                 # Registers all route modules
        auth.routes.js
        applications.routes.js
        user.routes.js
        communication.routes.js
        notifications.routes.js
        counsellor.routes.js
        admin.routes.js
        marketplace.routes.js
        resources.routes.js
        peer.routes.js
        wellness.routes.js
        analytics.routes.js
  src/
    assets/                      # Frontend assets
    components/                  # Shared React components
    components/reactbits/        # ReactBits-style UI
    components/ui/               # shadcn/Radix UI primitives
    hooks/                       # React hooks
    lib/                         # API, socket, and utility helpers
    pages/                       # Route-level pages/dashboards
    store/                       # Redux Toolkit store and slices
    App.jsx
    main.jsx
```

The project uses MongoDB only for persistence and JavaScript only for app code.
