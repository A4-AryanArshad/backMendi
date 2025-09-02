# Mehndi Booking Platform - Backend API

A complete backend API for a mehndi artist booking platform built with Node.js, Express, and MongoDB following MVC architecture.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Client/Artist)
  - Password hashing with bcrypt
  - Email verification
  - Password reset functionality
  - Account lockout after failed attempts

- **User Management**
  - Client and Artist profiles
  - Artist verification system
  - Profile management
  - Location-based search

- **Job Management**
  - Job posting by clients
  - Advanced filtering and search
  - View tracking
  - Status management

- **Proposal System**
  - Artist job applications
  - Proposal management
  - Status tracking
  - Competitiveness scoring

- **Messaging System**
  - Real-time communication
  - Conversation management
  - Unread message tracking
  - File attachments

- **Review System**
  - Client reviews for completed jobs
  - Rating breakdown
  - Review moderation
  - Artist rating calculation

- **File Upload**
  - Image and document uploads
  - File type validation
  - Size limitations
  - Secure storage

## 🛠️ Technologies

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: Nodemailer (configured for future use)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-website/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/mehndi_booking_db
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   CORS_ORIGIN=http://localhost:3001
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+447123456789",
  "userType": "client",
  "location": {
    "city": "London",
    "address": "123 Main St"
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <jwt_token>
```

### Job Endpoints

#### Get All Jobs
```http
GET /jobs?category=bridal&city=london&page=1&limit=10
```

#### Create Job (Clients only)
```http
POST /jobs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Bridal Mehndi for Wedding",
  "description": "Looking for experienced artist...",
  "category": "bridal",
  "eventDetails": {
    "eventType": "wedding",
    "eventDate": "2024-06-15",
    "eventTime": "14:00",
    "duration": { "estimated": 4 },
    "guestCount": 15
  },
  "location": {
    "address": "123 Wedding Venue",
    "city": "London",
    "postalCode": "SW1A 1AA"
  },
  "budget": {
    "min": 300,
    "max": 500
  }
}
```

### Proposal Endpoints

#### Create Proposal (Artists only)
```http
POST /proposals
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "jobId": "job_id_here",
  "message": "I would love to work on your event...",
  "pricing": {
    "totalPrice": 400,
    "currency": "GBP"
  },
  "serviceDetails": {
    "estimatedDuration": { "value": 4, "unit": "hours" }
  },
  "experience": {
    "yearsOfExperience": 5
  }
}
```

#### Get Artist's Proposals
```http
GET /proposals/my-proposals
Authorization: Bearer <jwt_token>
```

### Message Endpoints

#### Get Conversations
```http
GET /messages/conversations
Authorization: Bearer <jwt_token>
```

#### Send Message
```http
POST /messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "recipient": "user_id_here",
  "content": "Hello, I'm interested in your services..."
}
```

### Review Endpoints

#### Create Review (Clients only)
```http
POST /reviews
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "jobId": "job_id_here",
  "rating": {
    "overall": 5,
    "breakdown": {
      "quality": 5,
      "punctuality": 5,
      "professionalism": 5
    }
  },
  "title": "Excellent Service",
  "comment": "Amazing work, highly recommended!",
  "experience": {
    "wouldRecommend": true,
    "wouldHireAgain": true
  }
}
```

### User Endpoints

#### Get Artists
```http
GET /users/artists?specialty=bridal&city=london&minRating=4
```

#### Get Artist Profile
```http
GET /users/artist/:artistId
```

### Upload Endpoints

#### Upload Single Image
```http
POST /upload/image
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

image: <file>
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for specific origins
- **Helmet**: Security headers
- **Input Validation**: Comprehensive validation using express-validator
- **Password Security**: Bcrypt with salt rounds
- **File Upload Security**: File type and size validation

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── User.js              # User model
│   ├── Job.js               # Job model
│   ├── Proposal.js          # Proposal model
│   ├── Message.js           # Message model
│   └── Review.js            # Review model
├── routes/
│   ├── auth.js              # Auth routes
│   ├── jobs.js              # Job routes
│   ├── proposals.js         # Proposal routes
│   ├── messages.js          # Message routes
│   ├── reviews.js           # Review routes
│   ├── users.js             # User routes
│   └── upload.js            # Upload routes
├── uploads/
│   ├── images/              # Uploaded images
│   └── documents/           # Uploaded documents
├── .env                     # Environment variables
├── server.js                # Main server file
└── package.json             # Dependencies
```

## 🚦 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_production_jwt_secret
CORS_ORIGIN=https://yourdomain.com
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start server.js --name "mehndi-api"
pm2 startup
pm2 save
```

## 📝 API Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `423` - Locked (Account locked)
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support, email support@mehndibooking.com or create an issue in the repository.

---

**Built with ❤️ for the Mehndi Artist Community** 