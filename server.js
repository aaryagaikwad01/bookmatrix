const express = require("express");
const session = require("cookie-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

function createApp(options = {}) {
const app = express();
const cloud = Boolean(options.cloud);
let dirty = false;
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "database.json");

// ---------------------------------------------------------------------
// Lightweight Pure-JS Database Engine (No C++ compilation or native addons)
// ---------------------------------------------------------------------
function loadDb() {
  if (!fs.existsSync(dbPath)) {
    return {
      users: [],
      books: [],
      requests: [],
      wishlist: [],
      reading_list: [],
      events: [],
      registrations: []
    };
  }
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    const data = JSON.parse(raw);
    data.users = data.users || [];
    data.books = data.books || [];
    data.requests = data.requests || [];
    data.wishlist = data.wishlist || [];
    data.reading_list = data.reading_list || [];
    data.events = data.events || [];
    data.registrations = data.registrations || [];
    return data;
  } catch (e) {
    console.error("Error reading database.json, starting fresh:", e);
    return { users: [], books: [], requests: [], wishlist: [], reading_list: [], events: [], registrations: [] };
  }
}

let db = options.db || loadDb();

function saveDb() {
 dirty = true;
 if (!cloud) fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

function nextId(table) {
  const rows = db[table] || [];
  return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
}

// ---------------------------------------------------------------------
// Initial Seed Data (Admin, Demo Reader, Catalogue Books, Events)
// ---------------------------------------------------------------------
function initSeed() {
  let changed = false;

  // 1. Admin account
  const adminEmail = cloud ? process.env.ADMIN_EMAIL.trim().toLowerCase() : "admin@bookmatrix.local";
 const adminPassword = cloud ? process.env.ADMIN_PASSWORD : "Admin123!";
 let admin = db.users.find(u => u.email === adminEmail);
  if (!admin) {
    admin = {
      id: nextId("users"),
      name: "BookMatrix Admin",
      email: adminEmail,
      password: bcrypt.hashSync(adminPassword, 10),
      role: "admin"
    };
    db.users.push(admin);
    changed = true;
  }

  // 2. Demo Member account (Clara)
  let reader = db.users.find(u => u.email === "reader@bookmatrix.local");
  if (!reader && !cloud) {
    reader = {
      id: nextId("users"),
      name: "Clara Oswald",
      email: "reader@bookmatrix.local",
      password: bcrypt.hashSync("Reader123!", 10),
      role: "member"
    };
    db.users.push(reader);
    changed = true;
  }

  // 3. Books
  if (db.books.length === 0) {
    const seedBooks = [
      { title: "Atomic Habits", author: "James Clear", category: "Self-growth", year: 2018, cover: "assets/books/atomic-habits.jpg", description: "An easy and proven way to build good habits and break bad ones.", total: 4, available: 3 },
      { title: "Red, White & Royal Blue", author: "Casey McQuiston", category: "Romance", year: 2019, cover: "assets/books/red-white-royal-blue.jpg", description: "A witty enemies-to-lovers story between the First Son of the US and the Prince of Wales.", total: 5, available: 4 },
      { title: "The Fault in Our Stars", author: "John Green", category: "Young Adult", year: 2012, cover: "assets/books/fault-in-our-stars.jpg", description: "The beloved story of Hazel Grace Lancaster and Augustus Waters.", total: 4, available: 3 },
      { title: "Me Before You", author: "Jojo Moyes", category: "Romance", year: 2012, cover: "assets/books/me-before-you.jpg", description: "A heartbreakingly romantic novel about Louisa Clark and Will Traynor.", total: 5, available: 5 },
      { title: "The Diary of a Young Girl", author: "Anne Frank", category: "Classics", year: 1947, cover: "assets/books/anne-frank.jpg", description: "The world-famous writings kept by Anne Frank during World War II.", total: 3, available: 2 },
      { title: "The Happiest Man on Earth", author: "Eddie Jaku", category: "Memoir", year: 2020, cover: "assets/books/happiest-man.jpg", description: "The incredible memoir of an Auschwitz survivor on gratitude, love, and hope.", total: 4, available: 4 },
      { title: "To All the Boys I've Loved Before", author: "Jenny Han", category: "Young Adult", year: 2014, cover: "assets/books/to-all-the-boys.jpg", description: "Lara Jean's secret love letters are accidentally mailed to all the boys she's loved.", total: 4, available: 3 },
      { title: "The Housemaid", author: "Freida McFadden", category: "Thriller", year: 2022, cover: "assets/books/the-housemaid.jpg", description: "A gripping psychological thriller full of twists about secrets behind closed doors.", total: 5, available: 4 },
      { title: "The Midnight Library", author: "Matt Haig", category: "Fiction", year: 2020, cover: "https://covers.openlibrary.org/b/id/10313767-L.jpg", description: "Between life and death there is a library, and within it every story offers a chance to try another life.", total: 5, available: 5 },
      { title: "The Silent Patient", author: "Alex Michaelides", category: "Mystery", year: 2019, cover: "assets/books/the-silent-patient.jpg", description: "A gripping psychological thriller about a woman who refuses to speak.", total: 3, available: 3 },
      { title: "Ikigai", author: "Héctor García", category: "Wellness", year: 2016, cover: "assets/books/ikigai.jpg", description: "A gentle exploration of the Japanese secret to a long and happy life.", total: 4, available: 4 },
      { title: "Pride and Prejudice", author: "Jane Austen", category: "Classics", year: 1813, cover: "assets/books/pride-and-prejudice.jpg", description: "A timeless classic about first impressions, family, and love.", total: 3, available: 3 },
      { title: "The Design of Everyday Things", author: "Don Norman", category: "Design", year: 2013, cover: "assets/books/design-of-everyday-things.jpg", description: "Discover how thoughtful design can make everyday objects easier to use.", total: 2, available: 2 }
    ];
    seedBooks.forEach(b => {
      b.id = nextId("books");
      db.books.push(b);
    });
    changed = true;
  }

  // 4. Events
  if (db.events.length === 0) {
    db.events.push(
      {
        id: 1,
        title: "Author Meet & Book Signing",
        category: "Workshops",
        tag: "Featured Event",
        date: "2026-10-25",
        date_formatted: "25 October 2026",
        time: "5:00 PM",
        time_full: "5:00 PM – 7:30 PM",
        location: "Main Auditorium",
        coordinator: "Dr. Evelyn Reed (Chief Curator)",
        coordinator_phone: "+91 98765 43210",
        coordinator_email: "evelyn.reed@bookmatrix.local",
        fees: 299,
        capacity: 60,
        status: "limited",
        status_label: "Few Seats",
        image: "author meet.jpg",
        description: "Meet bestselling authors, discover their latest books, participate in an interactive Q&A session, and receive signed copies during this special evening event.",
        highlights: [
          "Keynote address by internationally acclaimed novelists",
          "Open audience Q&A with live microphone round",
          "Exclusive author-signed hardcover copies & bookmark kits",
          "Evening refreshments and literary networking reception"
        ]
      },
      {
        id: 2,
        title: "Reading Club",
        category: "Book Clubs",
        tag: "Book Club",
        date: "2026-10-18",
        date_formatted: "18 October 2026",
        time: "4:00 PM",
        time_full: "4:00 PM – 5:30 PM",
        location: "Room 2B",
        coordinator: "Sarah Jenkins (Book Club Lead)",
        coordinator_phone: "+91 98765 43211",
        coordinator_email: "sarah.j@bookmatrix.local",
        fees: 0,
        capacity: 30,
        status: "open",
        status_label: "Open",
        image: "reading club.jpg",
        description: "Discuss this month's featured novel with fellow readers and literature lovers.",
        highlights: [
          "In-depth group chapter discussions & theme breakdowns",
          "Coffee & tea bar provided for all attendees",
          "Book recommendation exchange for next month's selection",
          "Welcoming to readers of all levels and backgrounds"
        ]
      },
      {
        id: 3,
        title: "Coding Workshop",
        category: "Workshops",
        tag: "Workshop",
        date: "2026-10-20",
        date_formatted: "20 October 2026",
        time: "11:00 AM",
        time_full: "11:00 AM – 1:00 PM",
        location: "Tech Lab 1",
        coordinator: "Arun Verma (Digital Mentor)",
        coordinator_phone: "+91 98765 43212",
        coordinator_email: "arun.v@bookmatrix.local",
        fees: 199,
        capacity: 25,
        status: "open",
        status_label: "Open",
        image: "coding workshop.jpg",
        description: "Learn HTML, CSS, and JavaScript fundamentals through hands-on guided projects.",
        highlights: [
          "Build a live interactive portfolio project from scratch",
          "Hands-on guidance with modern web development tools",
          "Full starter code repository and cheat sheets provided",
          "Certificate of workshop participation included"
        ]
      },
      {
        id: 4,
        title: "Kids Story Time",
        category: "Kids & Youth",
        tag: "Kids",
        date: "2026-10-22",
        date_formatted: "22 October 2026",
        time: "3:00 PM",
        time_full: "3:00 PM – 4:30 PM",
        location: "Children's Wing",
        coordinator: "Maya Lin (Youth Program Lead)",
        coordinator_phone: "+91 98765 43213",
        coordinator_email: "maya.lin@bookmatrix.local",
        fees: 0,
        capacity: 35,
        status: "open",
        status_label: "Open",
        image: "kids story.jpg",
        description: "Interactive storytelling, picture books, and creative crafting activities for children.",
        highlights: [
          "Animated fairy tale reading by children's storytellers",
          "Fun hands-on origami & drawing craft corner",
          "Free picture book take-home badge for young readers",
          "Supervised safe space designed for ages 4 to 12"
        ]
      },
      {
        id: 5,
        title: "Career Guidance",
        category: "Career & Tech",
        tag: "Career",
        date: "2026-10-28",
        date_formatted: "28 October 2026",
        time: "2:00 PM",
        time_full: "2:00 PM – 4:00 PM",
        location: "Conference Room A",
        coordinator: "Priya Sharma (Career Consultant)",
        coordinator_phone: "+91 98765 43214",
        coordinator_email: "priya.s@bookmatrix.local",
        fees: 149,
        capacity: 40,
        status: "open",
        status_label: "Open",
        image: "career guidance.jpg",
        description: "Professional career counselling, resume building workshops, and interview preparation.",
        highlights: [
          "1-on-1 resume review and LinkedIn profile audits",
          "Mock interview practice with real industry experts",
          "Job market transition strategies and career roadmap",
          "Digital career toolkit with resume templates and interview guides"
        ]
      },
      {
        id: 6,
        title: "Creative Thinking Workshop",
        category: "Workshops",
        tag: "Creativity",
        date: "2026-11-15",
        date_formatted: "15 November 2026",
        time: "10:30 AM",
        time_full: "10:30 AM – 12:30 PM",
        location: "Activity Room",
        coordinator: "Clara Oswald (Community Facilitator)",
        coordinator_phone: "+91 98765 43215",
        coordinator_email: "clara.o@bookmatrix.local",
        fees: 199,
        capacity: 30,
        status: "open",
        status_label: "Open",
        image: "event3.jpeg",
        description: "Explore fresh ideas, creative problem solving, and turn your curiosity into something wonderful.",
        highlights: [
          "Brainstorming sprint techniques from design leaders",
          "Mind-mapping and creative ideation exercises",
          "Collaborative group storytelling games",
          "Creative journal kit provided for all participants"
        ]
      }
    );
    changed = true;
  }

  // 5. Seed sample member activity for Clara if empty so all columns have rich demo data
  if (reader && db.requests.filter(r => r.user_id === reader.id).length === 0) {
    const today = new Date();
    const toYMD = d => d.toISOString().split("T")[0];

    // Issued book (due in 11 days)
    const issuedDate = new Date(today); issuedDate.setDate(issuedDate.getDate() - 3);
    const dueDate = new Date(today); dueDate.setDate(dueDate.getDate() + 11);
    const pStart1 = new Date(today); pStart1.setDate(pStart1.getDate() - 4);
    const pEnd1 = new Date(today); pEnd1.setDate(pEnd1.getDate() - 1);

    db.requests.push({
      id: nextId("requests"),
      user_id: reader.id,
      book_id: 5, // Anne Frank
      status: "issued",
      requested_at: new Date(today.getTime() - 5 * 86400000).toISOString(),
      pickup_start: toYMD(pStart1),
      pickup_end: toYMD(pEnd1),
      issued_at: issuedDate.toISOString(),
      due_at: toYMD(dueDate),
      returned_at: null,
      admin_notes: "Collected at counter desk."
    });

    // Approved book ready for pickup (between tomorrow and 4 days later)
    const pStart2 = new Date(today); pStart2.setDate(pStart2.getDate() + 1);
    const pEnd2 = new Date(today); pEnd2.setDate(pEnd2.getDate() + 5);
    const due2 = new Date(today); due2.setDate(due2.getDate() + 18);

    db.requests.push({
      id: nextId("requests"),
      user_id: reader.id,
      book_id: 1, // Atomic Habits
      status: "approved",
      requested_at: new Date(today.getTime() - 2 * 86400000).toISOString(),
      pickup_start: toYMD(pStart2),
      pickup_end: toYMD(pEnd2),
      issued_at: null,
      due_at: toYMD(due2),
      returned_at: null,
      admin_notes: "Ready for pickup. Held at front desk."
    });

    // Currently reading
    db.reading_list.push({
      id: nextId("reading_list"),
      user_id: reader.id,
      book_id: 5,
      progress: 45,
      started_at: issuedDate.toISOString()
    });

    // Wishlist
    db.wishlist.push(
      { id: nextId("wishlist"), user_id: reader.id, book_id: 8, created_at: new Date().toISOString() }, // The Housemaid
      { id: nextId("wishlist"), user_id: reader.id, book_id: 4, created_at: new Date().toISOString() }  // Me Before You
    );

    // Event registration
    db.registrations.push({
      id: nextId("registrations"),
      event_id: 1,
      user_id: reader.id,
      registered_at: new Date().toISOString()
    });

    changed = true;
  }

  if (changed) saveDb();
}

initSeed();

// ---------------------------------------------------------------------
// Middleware & Session
// ---------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({name:'bookmatrix_session', keys:[process.env.SESSION_SECRET || 'local-development-only'],httpOnly:true,sameSite:'lax',secure:cloud,maxAge:43200000}));
app.use('/api', (req,res,next) => {
 res.set('Cache-Control','no-store');
 const origin = req.get('origin');
 if (!['GET','HEAD','OPTIONS'].includes(req.method) && origin && origin !== req.protocol + '://' + req.get('host')) return res.status(403).json({error:'Cross-site requests are not allowed.'});
 if (cloud) {
  const send = res.json.bind(res);
  res.json = body => {
   Promise.resolve().then(async () => { if(dirty) await options.persist(db); send(body); }).catch(err => {
    console.error('Database commit failed:',err.message); req.session=null;
    res.status(err.code === 'CONFLICT' ? 409 : 503);
    send({error:err.code === 'CONFLICT' ? 'Data changed during this request. Please retry.' : 'Storage unavailable. No changes confirmed. Please retry.'});
   }); return res;
  };
 }
 next();
});
const publicDirs = [
  path.join(__dirname, "public"),
  path.join(__dirname, "BookMatrix_updated", "public")
];
publicDirs.forEach(dir => {
  if (fs.existsSync(dir)) app.use(express.static(dir));
});

const currentUser = req => req.session.user || null;
const requireAuth = (req, res, next) => currentUser(req) ? next() : res.status(401).json({ error: "Please sign in first." });
const requireAdmin = (req, res, next) => currentUser(req)?.role === "admin" ? next() : res.status(403).json({ error: "Administrator access required." });

// ---------------------------------------------------------------------
// Authentication Endpoints (User Sign In vs Admin Sign In)
// ---------------------------------------------------------------------
app.get("/api/me", (req, res) => res.json({ user: currentUser(req) }));

// Registration for members & administrators
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: "Enter your name, a valid email, and a password of at least 8 characters." });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (db.users.some(u => u.email === cleanEmail)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const hash = await bcrypt.hash(password, 10);
  if (cloud && role === "admin") return res.status(403).json({error:"Public administrator registration is disabled. Use the configured administrator account."});
 const userRole = (role === "admin" && !cloud) ? "admin" : "member";
  const newUser = {
    id: nextId("users"),
    name: name.trim(),
    email: cleanEmail,
    password: hash,
    role: userRole
  };
  db.users.push(newUser);
  saveDb();

  req.session.user = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
  res.json({ user: req.session.user });
});

// Flexible Login endpoint with portal check
app.post("/api/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const loginType = String(req.body.loginType || "user"); // 'user' or 'admin'

  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  // Admin login validation: prevent non-admins from signing in through Admin Portal
  if (loginType === "admin" && user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied: This portal is reserved for library administrators. Please use Reader Sign In."
    });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: req.session.user });
});

// Dedicated Admin Login endpoint
app.post("/api/admin/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Incorrect administrator email or password." });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: This account does not have administrator privileges." });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: req.session.user });
});

app.post("/api/logout", (req, res) => { req.session = null; res.json({ ok: true }); });

// ---------------------------------------------------------------------
// Catalogue & Event Endpoints
// ---------------------------------------------------------------------
app.get("/api/books", (req, res) => {
  const { q = "", category = "" } = req.query;
  const search = String(q).toLowerCase();
  const cat = String(category).trim();

  let list = db.books;
  if (cat) list = list.filter(b => b.category.toLowerCase() === cat.toLowerCase());
  if (search) {
    list = list.filter(b =>
      b.title.toLowerCase().includes(search) ||
      b.author.toLowerCase().includes(search) ||
      (b.description || "").toLowerCase().includes(search)
    );
  }
  res.json(list);
});

app.get("/api/categories", (req, res) => {
  const cats = [...new Set(db.books.map(b => b.category))].sort();
  res.json(cats);
});

app.get("/api/events", (req, res) => {
  const user = currentUser(req);
  const list = db.events.map(e => {
    const attendees = db.registrations.filter(r => r.event_id === e.id).reduce((sum, r) => sum + (Number(r.seats) || 1), 0);
    const registered = user ? db.registrations.some(r => r.event_id === e.id && (r.user_id === user.id || (r.attendee_email && r.attendee_email.toLowerCase() === user.email.toLowerCase()))) : false;
    return { ...e, attendees, registered };
  });
  res.json(list);
});

app.get("/api/events/:id", (req, res) => {
  const eventId = Number(req.params.id);
  const user = currentUser(req);
  const event = db.events.find(e => e.id === eventId || String(e.id) === req.params.id || e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === req.params.id.toLowerCase());
  if (!event) return res.status(404).json({ error: "Event not found." });

  const attendees = db.registrations.filter(r => r.event_id === event.id).reduce((sum, r) => sum + (Number(r.seats) || 1), 0);
  const registered = user ? db.registrations.some(r => r.event_id === event.id && (r.user_id === user.id || (r.attendee_email && r.attendee_email.toLowerCase() === user.email.toLowerCase()))) : false;

  res.json({ ...event, attendees, registered });
});

app.post("/api/events/:id/register", (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: "Event not found." });

  const user = currentUser(req);
  const { name, email, phone, seats, payment_method, transaction_id, amount } = req.body || {};

  const attendeeName = (name || user?.name || "Guest Attendee").trim();
  const attendeeEmail = (email || user?.email || "").trim().toLowerCase();
  const attendeePhone = (phone || "").trim();
  const seatCount = Math.max(1, Math.min(10, Number(seats) || 1));
  const paymentMethod = payment_method || (event.fees > 0 ? "upi" : "free");
  const transactionId = (transaction_id || "").trim();
  const amountPaid = Number(amount) || ((event.fees || 0) * seatCount);

  // Generate unique booking reference
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = `BM-EVT-2026-${randomCode}`;

  const newReg = {
    id: nextId("registrations"),
    event_id: eventId,
    event_title: event.title,
    user_id: user ? user.id : null,
    attendee_name: attendeeName,
    attendee_email: attendeeEmail,
    attendee_phone: attendeePhone,
    seats: seatCount,
    payment_method: paymentMethod,
    transaction_id: transactionId,
    amount_paid: amountPaid,
    booking_ref: bookingRef,
    status: "confirmed",
    registered_at: new Date().toISOString()
  };

  db.registrations.push(newReg);
  saveDb();
  res.json({ ok: true, registration: newReg, booking_ref: bookingRef });
});

app.delete("/api/events/:id/register", requireAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const userId = currentUser(req).id;
  db.registrations = db.registrations.filter(r => !(r.event_id === eventId && r.user_id === userId));
  saveDb();
  res.json({ ok: true, message: "Registration cancelled." });
});

// ---------------------------------------------------------------------
// Member Account Endpoints (Overview, Reading List, Wishlist, Requests)
// ---------------------------------------------------------------------
app.get("/api/my/overview", requireAuth, (req, res) => {
  const userId = currentUser(req).id;

  // Requests with book details
  const requests = db.requests
    .filter(r => r.user_id === userId)
    .sort((a, b) => b.id - a.id)
    .map(r => {
      const b = db.books.find(x => x.id === r.book_id) || {};
      return {
        ...r,
        title: b.title || "Untitled",
        author: b.author || "Unknown",
        cover: b.cover || "",
        category: b.category || ""
      };
    });

  // Reading List with book details & due date if issued
  const readingList = db.reading_list
    .filter(rl => rl.user_id === userId)
    .sort((a, b) => b.id - a.id)
    .map(rl => {
      const b = db.books.find(x => x.id === rl.book_id) || {};
      const activeLoan = db.requests.find(r => r.user_id === userId && r.book_id === rl.book_id && r.status === "issued");
      return {
        ...rl,
        title: b.title || "Untitled",
        author: b.author || "Unknown",
        cover: b.cover || "",
        category: b.category || "",
        due_at: activeLoan ? activeLoan.due_at : null
      };
    });

  // Wishlist with book details
  const wishlist = db.wishlist
    .filter(w => w.user_id === userId)
    .sort((a, b) => b.id - a.id)
    .map(w => {
      const b = db.books.find(x => x.id === w.book_id) || {};
      return {
        wishlist_id: w.id,
        created_at: w.created_at,
        ...b
      };
    });

  // Registered Events
  const registeredEvents = db.registrations
    .filter(r => r.user_id === userId)
    .map(reg => {
      const ev = db.events.find(e => e.id === reg.event_id) || {};
      return {
        registration_id: reg.id,
        registered_at: reg.registered_at,
        ...ev
      };
    });

  res.json({
    user: currentUser(req),
    requests,
    readingList,
    wishlist,
    registeredEvents
  });
});

app.get("/api/my/requests", requireAuth, (req, res) => {
  const userId = currentUser(req).id;
  const list = db.requests
    .filter(r => r.user_id === userId)
    .sort((a, b) => b.id - a.id)
    .map(r => {
      const b = db.books.find(x => x.id === r.book_id) || {};
      return { ...r, title: b.title, author: b.author, cover: b.cover, category: b.category };
    });
  res.json(list);
});

app.post("/api/books/:id/request", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  const book = db.books.find(b => b.id === bookId);
  if (!book) return res.status(404).json({ error: "Book not found." });
  if (book.available < 1) return res.status(409).json({ error: "This book is currently unavailable." });

  const active = db.requests.find(r => r.user_id === userId && r.book_id === bookId && ["pending", "approved", "issued"].includes(r.status));
  if (active) return res.status(409).json({ error: "You already have an active request or loan for this book." });

  const newReq = {
    id: nextId("requests"),
    user_id: userId,
    book_id: bookId,
    status: "pending",
    requested_at: new Date().toISOString(),
    pickup_start: null,
    pickup_end: null,
    issued_at: null,
    due_at: null,
    returned_at: null,
    admin_notes: ""
  };
  db.requests.push(newReq);
  saveDb();
  res.json({ ok: true, message: "Request submitted! The librarian will review it and set your pickup and due dates." });
});

// Currently Reading CRUD
app.get("/api/my/reading-list", requireAuth, (req, res) => {
  const userId = currentUser(req).id;
  const list = db.reading_list.filter(rl => rl.user_id === userId).map(rl => {
    const b = db.books.find(x => x.id === rl.book_id) || {};
    return { ...rl, ...b };
  });
  res.json(list);
});

app.post("/api/my/reading-list/:id", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  const progress = Math.min(100, Math.max(0, parseInt(req.body.progress, 10) || 0));

  let existing = db.reading_list.find(rl => rl.user_id === userId && rl.book_id === bookId);
  if (existing) {
    existing.progress = progress;
  } else {
    db.reading_list.push({
      id: nextId("reading_list"),
      user_id: userId,
      book_id: bookId,
      progress,
      started_at: new Date().toISOString()
    });
  }
  saveDb();
  res.json({ ok: true, message: "Added to Currently Reading!" });
});

app.patch("/api/my/reading-list/:id", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  const progress = Math.min(100, Math.max(0, parseInt(req.body.progress, 10) || 0));

  const existing = db.reading_list.find(rl => rl.user_id === userId && rl.book_id === bookId);
  if (existing) {
    existing.progress = progress;
    saveDb();
  }
  res.json({ ok: true });
});

app.delete("/api/my/reading-list/:id", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  db.reading_list = db.reading_list.filter(rl => !(rl.user_id === userId && rl.book_id === bookId));
  saveDb();
  res.json({ ok: true, message: "Removed from Currently Reading." });
});

// Wishlist CRUD
app.get("/api/my/wishlist", requireAuth, (req, res) => {
  const userId = currentUser(req).id;
  const list = db.wishlist.filter(w => w.user_id === userId).map(w => {
    const b = db.books.find(x => x.id === w.book_id) || {};
    return { wishlist_id: w.id, created_at: w.created_at, ...b };
  });
  res.json(list);
});

app.post("/api/my/wishlist/:id", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  const idx = db.wishlist.findIndex(w => w.user_id === userId && w.book_id === bookId);

  if (idx >= 0) {
    db.wishlist.splice(idx, 1);
    saveDb();
    return res.json({ ok: true, inWishlist: false, message: "Removed from wishlist." });
  } else {
    db.wishlist.push({
      id: nextId("wishlist"),
      user_id: userId,
      book_id: bookId,
      created_at: new Date().toISOString()
    });
    saveDb();
    return res.json({ ok: true, inWishlist: true, message: "Saved to your wishlist!" });
  }
});

app.delete("/api/my/wishlist/:id", requireAuth, (req, res) => {
  const bookId = Number(req.params.id);
  const userId = currentUser(req).id;
  db.wishlist = db.wishlist.filter(w => !(w.user_id === userId && w.book_id === bookId));
  saveDb();
  res.json({ ok: true, message: "Removed from wishlist." });
});

// ---------------------------------------------------------------------
// Administrator Endpoints (Approval with pickup window & due date)
// ---------------------------------------------------------------------
app.get("/api/admin/overview", requireAdmin, (req, res) => {
  const pendingCount = db.requests.filter(r => r.status === "pending").length;
  const approvedCount = db.requests.filter(r => r.status === "approved").length;
  const issuedCount = db.requests.filter(r => r.status === "issued").length;

  const requests = db.requests.map(r => {
    const user = db.users.find(u => u.id === r.user_id) || {};
    const book = db.books.find(b => b.id === r.book_id) || {};
    return {
      ...r,
      user_name: user.name || "Member",
      email: user.email || "",
      book_title: book.title || "Unknown Book",
      book_cover: book.cover || ""
    };
  }).sort((a, b) => b.id - a.id);

  res.json({
    counts: {
      books: db.books.length,
      users: db.users.filter(u => u.role === "member").length,
      pending: pendingCount,
      approved: approvedCount,
      issued: issuedCount
    },
    requests,
    books: [...db.books].reverse(),
    users: db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })).reverse(),
    events: [...db.events],
    registrations: (db.registrations || []).map(reg => {
      const ev = db.events.find(e => e.id === reg.event_id) || {};
      return {
        ...reg,
        event_title: reg.event_title || ev.title || "Library Event",
        event_date: ev.date_formatted || ev.date || ""
      };
    }).reverse()
  });
});

// Approve Request: Admin sets pickup window (start and end) and return due date
app.post("/api/admin/requests/:id/approve", requireAdmin, (req, res) => {
  const reqId = Number(req.params.id);
  const r = db.requests.find(x => x.id === reqId);
  if (!r || !["pending", "approved"].includes(r.status)) {
    return res.status(400).json({ error: "Only pending or approved requests can be scheduled." });
  }

  const book = db.books.find(b => b.id === r.book_id);
  if (!book || (r.status === "pending" && book.available < 1)) {
    return res.status(409).json({ error: "No copies of this book are currently available to approve." });
  }

  // Calculate default dates if omitted
  const today = new Date();
  const toYMD = d => d.toISOString().split("T")[0];

  const defStart = new Date(today); defStart.setDate(defStart.getDate() + 1);
  const defEnd = new Date(defStart); defEnd.setDate(defEnd.getDate() + 4);
  const defDue = new Date(defStart); defDue.setDate(defDue.getDate() + 14);

  const pickupStart = req.body.pickup_start || toYMD(defStart);
  const pickupEnd = req.body.pickup_end || toYMD(defEnd);
  const dueDate = req.body.due_date || req.body.due_at || toYMD(defDue);
  const adminNotes = String(req.body.admin_notes || "").trim();

  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (![pickupStart, pickupEnd, dueDate].every(validDate) || pickupEnd < pickupStart || dueDate < pickupEnd) {
    return res.status(400).json({ error: "Enter valid dates: pickup end must be on or after pickup start, and return due date must be on or after pickup end." });
  }
  const wasPending = r.status === "pending";
  // Update request
  r.status = "approved";
  r.pickup_start = pickupStart;
  r.pickup_end = pickupEnd;
  r.due_at = dueDate;
  r.admin_notes = adminNotes;

  // Deduct available book count
  if (wasPending) book.available = Math.max(0, book.available - 1);
  saveDb();

  res.json({
    ok: true,
    message: `Request approved! Pickup window set from ${pickupStart} to ${pickupEnd}, return due by ${dueDate}.`
  });
});

// Reject Request
app.post("/api/admin/requests/:id/reject", requireAdmin, (req, res) => {
  const reqId = Number(req.params.id);
  const r = db.requests.find(x => x.id === reqId);
  if (!r || !["pending", "approved"].includes(r.status)) return res.status(400).json({ error: "Only pending or approved requests can be cancelled." });
  if (r.status === "approved") {
    const book = db.books.find(b => b.id === r.book_id);
    if (book) book.available = Math.min(book.total, book.available + 1);
  }
  r.status = "rejected";
  saveDb();
  res.json({ ok: true, message: "Request rejected." });
});

// Mark physically issued when member arrives within pickup dates
app.post("/api/admin/requests/:id/issue", requireAdmin, (req, res) => {
  const reqId = Number(req.params.id);
  const r = db.requests.find(x => x.id === reqId);
  if (!r || (r.status !== "approved" && r.status !== "pending")) {
    return res.status(400).json({ error: "Only approved (or pending) requests can be marked as physically issued." });
  }

  const today = new Date();
  const toYMD = d => d.toISOString().split("T")[0];

  // If was pending, decrease inventory
  if (r.status === "pending") {
    const book = db.books.find(b => b.id === r.book_id);
    if (!book || book.available < 1) return res.status(409).json({ error: "No copies available." });
    book.available = Math.max(0, book.available - 1);
  }

  r.status = "issued";
  r.issued_at = today.toISOString();
  if (req.body.due_date) {
    r.due_at = req.body.due_date;
  } else if (!r.due_at) {
    const d = new Date(today); d.setDate(d.getDate() + 14);
    r.due_at = toYMD(d);
  }

  // Also add to member's Currently Reading list if not already there!
  const hasReading = db.reading_list.find(rl => rl.user_id === r.user_id && rl.book_id === r.book_id);
  if (!hasReading) {
    db.reading_list.push({
      id: nextId("reading_list"),
      user_id: r.user_id,
      book_id: r.book_id,
      progress: 0,
      started_at: today.toISOString()
    });
  }

  saveDb();
  res.json({ ok: true, message: "Book physically issued! Added to member's currently reading list." });
});

// Mark returned
app.post("/api/admin/requests/:id/return", requireAdmin, (req, res) => {
  const reqId = Number(req.params.id);
  const r = db.requests.find(x => x.id === reqId);
  if (!r || r.status !== "issued") {
    return res.status(400).json({ error: "Only currently issued books can be marked returned." });
  }

  r.status = "returned";
  r.returned_at = new Date().toISOString();

  // Restock inventory
  const book = db.books.find(b => b.id === r.book_id);
  if (book) {
    book.available = Math.min(book.total, book.available + 1);
  }

  // Mark reading progress to 100%
  const rl = db.reading_list.find(item => item.user_id === r.user_id && item.book_id === r.book_id);
  if (rl) rl.progress = 100;

  saveDb();
  res.json({ ok: true, message: "Book marked as returned and inventory restored." });
});

// Add Book
app.post("/api/admin/books", requireAdmin, (req, res) => {
  const b = req.body;
  if (!b.title?.trim() || !b.author?.trim() || !b.category?.trim()) {
    return res.status(400).json({ error: "Title, author, and category are required." });
  }
  const total = Math.max(1, parseInt(b.total, 10) || 1);
  const newBook = {
    id: nextId("books"),
    title: b.title.trim(),
    author: b.author.trim(),
    category: b.category.trim(),
    year: parseInt(b.year, 10) || 2026,
    cover: b.cover || "",
    description: b.description || "",
    total,
    available: total
  };
  db.books.push(newBook);
  saveDb();
  res.json({ ok: true, message: "Book added to catalogue." });
});

// Delete Book
app.delete("/api/admin/books/:id", requireAdmin, (req, res) => {
  const bookId = Number(req.params.id);
  const used = db.requests.some(r => r.book_id === bookId);
  if (used) {
    return res.status(409).json({ error: "This book has borrowing history and cannot be deleted." });
  }
  db.books = db.books.filter(b => b.id !== bookId);
  db.wishlist = db.wishlist.filter(w => w.book_id !== bookId);
  db.reading_list = db.reading_list.filter(rl => rl.book_id !== bookId);
  saveDb();
  res.json({ ok: true, message: "Book deleted." });
});

// Add Event
app.post("/api/admin/events", requireAdmin, (req, res) => {
  const e = req.body;
  if (!e.title?.trim() || !e.date) {
    return res.status(400).json({ error: "Event title and date are required." });
  }
  const newEvent = {
    id: nextId("events"),
    title: e.title.trim(),
    date: e.date,
    location: e.location || "Community Library",
    description: e.description || ""
  };
  db.events.push(newEvent);
  saveDb();
  res.json({ ok: true, message: "Event published." });
});

// ---------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------
app.use('/api', (req,res) => res.status(404).json({error:'API endpoint not found.'}));
return app;
}
module.exports = {createApp};
if(require.main === module) createApp().listen(process.env.PORT || 3000, () => console.log('BookMatrix running locally'));
