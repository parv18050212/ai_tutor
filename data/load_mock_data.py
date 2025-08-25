import asyncio
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import init_db_pool, close_db_pool, get_db_pool
from rag import chunk_text, get_embeddings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock course data
MOCK_LESSONS = [
    {
        "title": "Introduction to Python Programming",
        "content": """
Python is a high-level, interpreted programming language with dynamic semantics. Its high-level built-in data structures, combined with dynamic typing and dynamic binding, make it very attractive for Rapid Application Development, as well as for use as a scripting or glue language to connect existing components together.

Python's simple, easy to learn syntax emphasizes readability and therefore reduces the cost of program maintenance. Python supports modules and packages, which encourages program modularity and code reuse. The Python interpreter and the extensive standard library are available in source or binary form without charge for all major platforms, and can be freely distributed.

Variables in Python are created when you assign a value to them. Unlike other programming languages, Python has no command for declaring a variable. The variable is created the moment you first assign a value to it. Variables do not need to be declared with any particular type, and can even change type after they have been set.
        """,
        "course": "CS101",
        "module": "Basics"
    },
    {
        "title": "Data Structures in Python",
        "content": """
Python has four built-in data types used to store collections of data: List, Tuple, Set, and Dictionary, all with different qualities and usage.

Lists are ordered collections that are changeable and allow duplicate members. Lists are created using square brackets. Tuples are ordered collections that are unchangeable and allow duplicate members. Tuples are created using round brackets.

Sets are unordered collections that are unindexed and do not allow duplicate members. Sets are created using curly brackets or the set() function. Dictionaries are ordered collections that are changeable and do not allow duplicate keys. Dictionaries are created using curly brackets with key-value pairs.

Each data structure has its own methods and properties. For example, lists have append(), remove(), and pop() methods, while dictionaries have keys(), values(), and items() methods.
        """,
        "course": "CS101",
        "module": "Data Structures"
    },
    {
        "title": "Functions and Scope in Python",
        "content": """
A function is a block of code that only runs when it is called. You can pass data, known as parameters, into a function. A function can return data as a result. In Python, functions are defined using the def keyword.

Parameters are specified after the function name, inside the parentheses. You can add as many parameters as you want, just separate them with a comma. Default parameter values can be specified by assigning a value to the parameter in the function definition.

Python follows the LEGB rule for variable scope: Local, Enclosing, Global, and Built-in. Local scope refers to variables defined inside a function. Enclosing scope refers to variables in the local scope of enclosing functions. Global scope refers to variables defined at the module level. Built-in scope refers to pre-assigned built-in names.

Lambda functions are small anonymous functions that can have any number of arguments but can only have one expression. They are useful for short functions that are used once.
        """,
        "course": "CS101",
        "module": "Functions"
    },
    {
        "title": "Object-Oriented Programming Concepts",
        "content": """
Object-Oriented Programming (OOP) is a programming paradigm that uses objects and classes to structure software programs. The main principles of OOP are encapsulation, inheritance, and polymorphism.

A class is a blueprint for creating objects. Objects are instances of classes that contain data (attributes) and code (methods). Encapsulation is the bundling of data and methods that work on that data within one unit, typically a class.

Inheritance allows a class to inherit attributes and methods from another class. The class that inherits is called a child class or subclass, and the class being inherited from is called a parent class or superclass.

Polymorphism allows objects of different classes to be treated as objects of a common base class. This enables a single interface to represent different underlying data types. Method overriding and method overloading are examples of polymorphism in action.
        """,
        "course": "CS102",
        "module": "OOP"
    },
    {
        "title": "Database Design Fundamentals",
        "content": """
Database design is the process of producing a detailed data model of a database. A well-designed database is essential for efficient data storage, retrieval, and management.

The relational model organizes data into tables (relations) consisting of rows (tuples) and columns (attributes). Each table represents an entity, and relationships between entities are established through foreign keys.

Normalization is the process of organizing data to minimize redundancy and improve data integrity. The main normal forms are First Normal Form (1NF), Second Normal Form (2NF), and Third Normal Form (3NF).

Primary keys uniquely identify each record in a table, while foreign keys establish relationships between tables. Indexes improve query performance by creating faster access paths to data.

ACID properties (Atomicity, Consistency, Isolation, Durability) ensure database transactions are processed reliably and maintain data integrity even in the event of system failures.
        """,
        "course": "CS201",
        "module": "Database Design"
    }
]

async def load_mock_data():
    """Load mock course data into the database."""
    try:
        await init_db_pool()
        pool = get_db_pool()
        
        logger.info("Starting to load mock data...")
        
        # Clear existing chunks
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM chunks")
            logger.info("Cleared existing chunks")
        
        for lesson in MOCK_LESSONS:
            logger.info(f"Processing lesson: {lesson['title']}")
            
            # Chunk the lesson content
            chunks = chunk_text(lesson['content'])
            logger.info(f"Created {len(chunks)} chunks for {lesson['title']}")
            
            # Get embeddings for all chunks
            chunk_texts = [chunk.content for chunk in chunks]
            embeddings = await get_embeddings(chunk_texts)
            
            # Store chunks with embeddings
            async with pool.acquire() as conn:
                for chunk, embedding in zip(chunks, embeddings):
                    metadata = {
                        "title": lesson['title'],
                        "course": lesson['course'],
                        "module": lesson['module'],
                        "chunk_index": chunk.chunk_index,
                        "start_char": chunk.start_char,
                        "end_char": chunk.end_char
                    }
                    
                    await conn.execute(
                        """
                        INSERT INTO chunks (content, embedding, metadata)
                        VALUES ($1, $2, $3)
                        """,
                        chunk.content,
                        embedding,
                        json.dumps(metadata)
                    )
            
            logger.info(f"Stored {len(chunks)} chunks for {lesson['title']}")
        
        # Get total count
        async with pool.acquire() as conn:
            count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
            logger.info(f"Successfully loaded {count} total chunks into the database")
        
    except Exception as e:
        logger.error(f"Error loading mock data: {e}")
        raise
    finally:
        await close_db_pool()

if __name__ == "__main__":
    asyncio.run(load_mock_data())