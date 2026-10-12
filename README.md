# Bus Ticket Reservation System

## Project Introduction

This project is a bus ticket reservation system designed and implemented with inspiration from the process and user interface of the **Safar724** website. The goal of the project was to simulate the process of searching for bus services, viewing trip information, and selecting seats using a full-stack architecture.

**UI design sample:**

[View a sample of the website's appearance](https://drive.google.com/file/d/1bKAPiJDvvOPJwmRDGqtUo6dlS5NmOQBG/view?usp=sharing)

The project was developed using **Go (net/http, Gin, GORM)** for the backend, **React + TypeScript + Vite** for the frontend, and **PostgreSQL (Neon)** as the database.

---
# Project Features

* Searching for bus services by origin, destination, and date
* Displaying service information
* Frontend and backend communication through a REST API
* Database structure designed according to normalization principles
* Multi-tier architecture (Frontend / Backend / Database)

---

# Technologies Used

## Backend

* Go
* net/http
* Gin
* GORM

## Frontend

* React
* TypeScript
* Vite
* React Router
* Jotai
* Tailwind CSS

## Database

* PostgreSQL
* Neon Database

---

# Project Architecture

The project consists of three main parts:

* **Frontend** for the user interface
* **Backend** for handling requests and application logic
* **PostgreSQL Database** for storing data

The frontend and backend communicate through a REST API, and the backend communicates with the PostgreSQL database using GORM.

---

# Project Structure

```
backend/
│
├── db/
├── models/
└── server/

devs/
│
├── assets/
├── components/
├── pages/
└── util/
```

---

# Database Model (ERD)

The project's ERD image is placed in this section.
![ERD image](Safar724.drawio.png)

### ERD Structure Explanation

The main entities are:

* User
* Service
* Ticket
* Passenger
* Seat
* BusType
* Company
* City
* RefundRule
* CancelationCondition
* SearchExpression

The relationships between entities are designed so that:

* Each service depends on a bus company, a bus type, and origin and destination cities.
* Each user can have multiple tickets.
* Each ticket can have at least one passenger.
* Each passenger is assigned to one seat.
* Cancellation and refund rules can be defined for each service.

---

# Backend Structure

The project's backend is developed in Go and includes the following parts:

* Defining data models with GORM
* Handling HTTP requests
* Implementing the REST API
* Communicating with PostgreSQL
* Managing routing with Gin

---

# Frontend Structure

The project's user interface is developed with React and TypeScript.

Main frontend features:

* Component-based architecture
* Route management with React Router
* State management with Jotai
* Responsive design
* Use of Tailwind CSS

---

# Key Technologies

| Area             | Technology   |
| ---------------- | ------------ |
| Backend          | Go           |
| HTTP Server      | net/http     |
| Web Framework    | Gin          |
| ORM              | GORM         |
| Frontend         | React        |
| Language         | TypeScript   |
| Build Tool       | Vite         |
| Routing          | React Router |
| State Management | Jotai        |
| Styling          | Tailwind CSS |
| Database         | PostgreSQL   |
| Cloud Database   | Neon         |

---

# Project Goals

* Gaining familiarity with backend development in Go
* Designing a REST API
* Modeling a relational database
* Developing a modern user interface with React
* Managing communication between the frontend and backend
* Simulating the bus ticket reservation process

---

# Suggestions for Future Development

* User authentication
* Admin panel
* Ticket booking and purchase
* Payment gateway integration
* Bus company management
* Service capacity management
* Reporting system
* User purchase history
* Dynamic refund and cancellation rules

---