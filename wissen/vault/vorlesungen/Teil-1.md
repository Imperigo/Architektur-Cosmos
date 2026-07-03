---
titel: "Teil 1"
quelle: "Studium Andrin (HSLU/ETH)"
datei: "Teil 1.pdf"
seiten: 16
ocr-seiten: 0
tags: [bauwissen, vorlesung]
---

# Teil 1

## S. 1

Begonnen am
Donnerstag, 7. November 2024, 16:36
Status
Beendet
Beendet am
Donnerstag, 7. November 2024, 17:07
Verbrauchte Zeit
30 Minuten 57 Sekunden
Punkte
84.00/95.00
Bewertung
5.31 von 6.00 (88.42%)
Frage 1
Richtig
Erreichte Punkte 2.00 von 2.00
Classes
What is the method in a class that gets automatically called when an object of the class is instantiat
× Objectifier (__obj__)
× Instantiator (__inst__)
× Creator (__create__)
✓Constructor (__init__)
Bewertungsmethode: SC1/0
Explanation:
__init__() is the default constructor in Python. The task of constructors is to initialize (assign values
instance of the class is created. Like methods, a constructor also contains a collection of statement
at the time of the instance creation. It runs as soon as an object of a class is instantiated.
Objectifier (__obj__): Nicht richtig
Instantiator (__inst__): Nicht richtig
Creator (__create__): Nicht richtig
Constructor (__init__): Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 16
07.11.2024, 17:10

## S. 2

Frage 2
Richtig
Erreichte Punkte 3.00 von 3.00
Classes
What does the following code print out?
class Brick(object):
   def __init__(self, width, height, depth):
       self.width = width
       self.height = height
       self.depth = depth
   def calculate_volume(self):
       return self.width * self.height * self.depth
my_brick = Brick(2, 1, 10)
print(my_brick.calculate_volume())
× ValueError
× None
× (2, 1, 10)
✓20
Bewertungsmethode: SC1/0
Explanation:
Following the structure of this code:
We are instantiating the Brick class with the following values:
2 for the width of the brick
1 for the height of the brick
10 for the depth of the brick.
Then, we are calling the method calculate_volume() on our brick instance, which calculates the resu
with the print() function.
ValueError: Nicht richtig
None: Nicht richtig
(2, 1, 10): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 16
07.11.2024, 17:10

## S. 3

Frage 3
Richtig
Erreichte Punkte 1.00 von 1.00
20: Richtig
Classes
Which of the following is not a principle of object-oriented programming?
✓Recursion
× Encapsulation
× Polymorphism
× Inheritance
Bewertungsmethode: SC1/0
Recursion: Richtig
Encapsulation: Nicht richtig
Polymorphism: Nicht richtig
Inheritance: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 16
07.11.2024, 17:10

## S. 4

Frage 4
Richtig
Erreichte Punkte 2.00 von 2.00
Classes
What is the main idea behind object-oriented programming (OOP)?
× It doesn't allow use of classes and objects.
× It focuses only on procedural code execution.
× It emphasizes only on the mathematical computations.
✓It allows programs to be organized in objects that combine data and behavior.
Bewertungsmethode: SC1/0
Explanation:
Object-oriented programming (OOP) is a method of structuring a program by bundling related pro
objects. Conceptually, objects are like the components of a system.
In Python, object-oriented Programming (OOPs) is a programming paradigm that uses objects and c
concept of OOPs is to bind the data and the functions that work on that together, as a single unit, s
access this data.
It doesn't allow use of classes and objects.: Nicht richtig
It focuses only on procedural code execution.: Nicht richtig
It emphasizes only on the mathematical computations.: Nicht richtig
It allows programs to be organized in objects that combine data and behavior.: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 16
07.11.2024, 17:10

## S. 5

Frage 5
Richtig
Erreichte Punkte 2.00 von 2.00
Classes
Which of the following is the use of __str__() method in python?
× Returns the type of the object
× Returns a memory location of an object
✓Return a string representation of an object
× Returns the name of the object
Bewertungsmethode: SC1/0
Explanation
Use __str__ if you have a class, and you'll want an informative/informal output, whenever you use t
Returns the type of the object: Nicht richtig
Returns a memory location of an object: Nicht richtig
Return a string representation of an object: Richtig
Returns the name of the object: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 16
07.11.2024, 17:10

## S. 6

Frage 6
Richtig
Erreichte Punkte 3.00 von 3.00
Classes
Assume a Brick class.
In which method would you store the volume of the Brick class, as an attribute of the class, if you w
instantiation of the Brick class?
× In the __str__() special method, and assigned to the self parameter
× In any method, as long as it is assigned to the self parameter
× In the first method of the class, after the __init__() special method
✓In the __init__() special method, and assigned to the self parameter
Bewertungsmethode: SC1/0
Explanation:
All classes have a special function called __init__(), which is always executed when the class is be
We use the __init__() function to assign values to the class object's properties, or other operations
object is being created. The self parameter is a reference to the current instance of the class, and
belongs to the class, therefore the way to store the volume of a Brick object, if we want it to be ava
Brick class, is inside the __init__() special method and assigned to the self parameter.
In the __str__() special method, and assigned to the self parameter: Nicht richtig
In any method, as long as it is assigned to the self parameter: Nicht richtig
In the first method of the class, after the __init__() special method: Nicht richtig
In the __init__() special method, and assigned to the self parameter: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 16
07.11.2024, 17:10

## S. 7

Frage 7
Falsch
Erreichte Punkte 0.00 von 1.00
Classes
What is the term used for the process of creating a new instance of a class?
× Iteration
× Initialization
× Functioning
✓Instantiation
Bewertungsmethode: SC1/0
Explanation
We use the term instantiation to refer to the process of creating new instances of a class. During th
class (the special method __init__() will be called).
Iteration: Nicht richtig
Initialization: Nicht richtig
Functioning: Nicht richtig
Instantiation: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 16
07.11.2024, 17:10

## S. 8

Frage 8
Richtig
Erreichte Punkte 2.00 von 2.00
Classes
In object-oriented programming, what is considered as a "blueprint" for creating objects?
× Variable
✓Class
× Function
× Module
Bewertungsmethode: SC1/0
Explanation:
In object-oriented programming, a class is a blueprint for creating objects (a particular data struct
state (attributes), and implementations of its behavior (methods). The class defines the nature of a
specific object created from a particular class.
A class is a way of organizing information about a type of data, so that a programmer can reuse el
instances of that data type.
Variable: Nicht richtig
Class: Richtig
Function: Nicht richtig
Module: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 16
07.11.2024, 17:10

## S. 9

Frage 9
Richtig
Erreichte Punkte 1.00 von 1.00
Comments
Which symbol is used to denote a comment in Python?
×
/* */
S
×
//
S
✓
#
S
✓
×
*
S
Bewertungsmethode: SC1/0
Explanation:
Comments starts with a #, and Python will ignore them:
# This is a comment
Comments can be placed at the end of a line, and Python will ignore the rest of the line:
print("Hello, World!") # This is a comment
/* */
: Nicht richtig
//
: Nicht richtig
#
: Richtig
*
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 16
07.11.2024, 17:10

## S. 10

Frage 10
Richtig
Erreichte Punkte 2.00 von 2.00
COMPAS
What is the primary difference between a Point and a Vector in the COMPAS geometry library?
× Points can be constructed without specifying coordinates, while Vectors always require co
× Points can only be used for mathematical calculations, while Vectors are used for renderin
✓A Point stores coordinates, while a Vector is defined by the coordinates at its end, which r
of the vector and a magnitude
× There is no difference; Points and Vectors are interchangeable in COMPAS.
Bewertungsmethode: SC1/0
Explanation:
A Point stores coordinates, while a Vector is defined by the coordinates at its end; these coordinate
(calculated by the subtraction of those coordinates with the origin (0,0,0)), and a magnitude, which 
length of the Vector class.
Points can be constructed without specifying coordinates, while Vectors always require coord
Points can only be used for mathematical calculations, while Vectors are used for rendering.: 
A Point stores coordinates, while a Vector is defined by the coordinates at its end, which repre
magnitude: Richtig
There is no difference; Points and Vectors are interchangeable in COMPAS.: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 16
07.11.2024, 17:10

## S. 11

Frage 11
Richtig
Erreichte Punkte 3.00 von 3.00
COMPAS
Given the following code snippet, what will be the value of result?
from compas.geometry import Point
p1 = Point(1, 0, 0)
p2 = Point(3, 0, 0)
result = p2 - p1
× result will contain a point, the coordinates of which are the subtraction of the coordinate
× The code will raise an error
× result will contain the distance between the 2 points
✓result will contain an instance of a Vector, which will have as coordinates of its origin the
coordinates of p1 from the point p2.
Bewertungsmethode: SC1/0
Explanation:
Subtraction between two instances of the Point class results in the creation of a vector, which will h
subtraction of the coordinates of the point p1 from the point p2.
result will contain a point, the coordinates of which are the subtraction of the coordinates p2
The code will raise an error: Nicht richtig
result will contain the distance between the 2 points: Nicht richtig
result will contain an instance of a Vector, which will have as coordinates of its origin the sub
the point p2.: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 16
07.11.2024, 17:10

## S. 12

Frage 12
Richtig
Erreichte Punkte 3.00 von 3.00
COMPAS
Consider two unitized vectors a and b.
What does it mean if the dot product of the two vectors is equal to 1: a.dot(b) == 1?
× The two vectors a and b are perpendicular to each other
✓The two vectors a and b are parallel to each other
× The two vectors are parallel and opposite to each other
× The two vectors a and b are intersecting on the point, which coordinates is the sum of the
origin of the two vectors
Bewertungsmethode: SC1/0
Explanation:
A vector dot product takes two vectors and produces a number. There is a relationship between th
and the angle between them.
If a and b two unitized vectors, then if:
a.dot(b) == 1 the vectors are parallel to each other
a.dot(b) == 0 the vectors are orthogonal to each other
a.dot(b) == -1 the vectors are parallel to each other, but in opposite directions
The two vectors a and b are perpendicular to each other: Nicht richtig
The two vectors a and b are parallel to each other: Richtig
The two vectors are parallel and opposite to each other: Nicht richtig
The two vectors a and b are intersecting on the point, which coordinates is the sum of the coo
vectors: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
12 von 16
07.11.2024, 17:10

## S. 13

Frage 13
Richtig
Erreichte Punkte 3.00 von 3.00
COMPAS
Assuming a unitized vector a in the following example, how could you check if it is parallel to the un
from compas.geometry import Vector
a = Vector(0, 0, 1)
✓The dot product of a and unit Z should be equals to 1 or -1, e.g. a.dot(Vector.Zaxis()) in (1,
× Substracting the vectors would result is 0 if the vectors are parallel, e.g. a - Vector.Zaxis()
× It is not possible to check.
× The cross product of a and unit Z should be equals to 1 or -1, e.g. a.cross(Vector.Zaxis()) 
Bewertungsmethode: SC1/0
Explanation
Two vectors are parallel when the absolute value of their dot product equals to 1. Conversely, two ve
dot product equals to 0.
The dot product of a and unit Z should be equals to 1 or -1, e.g. a.dot(Vector.Zaxis()) in (1, -1)
Substracting the vectors would result is 0 if the vectors are parallel, e.g. a - Vector.Zaxis() == 
It is not possible to check.: Nicht richtig
The cross product of a and unit Z should be equals to 1 or -1, e.g. a.cross(Vector.Zaxis()) in (1
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
13 von 16
07.11.2024, 17:10

## S. 14

Frage 14
Richtig
Erreichte Punkte 2.00 von 2.00
COMPAS
In the COMPAS geometry library, which class is used to represent a point in 3D space?
× Box
S
× Node
S
× Vector
S
✓Point
S
Bewertungsmethode: SC1/0
Explanation:
The class Point of COMPAS is a blueprint for creating individual 3D-point objects, with specific prop
Box: Nicht richtig
Node: Nicht richtig
Vector: Nicht richtig
Point: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
14 von 16
07.11.2024, 17:10

## S. 15

Frage 15
Falsch
Erreichte Punkte 0.00 von 3.00
COMPAS
How do you create a Box of dimensions 3x3x3 using COMPAS with one of its corners positioned at 
× my_box = Box.from_corner_corner_height(Point(2, 2, 0), Point(5, 5, 0), 3)
× my_box = Box.from_width_height_depth(3, 3, 3)
my_box.frame.point = Point(3.5, 3.5, 1.5)
× my_box = Box.from_diagonal((Point(2, 2, 0), Point(5, 5, 3)))
✓All of the above
× None of the above
Bewertungsmethode: SC1/0
Explanation:
Sometimes you need to write a Python class that provides multiple ways to construct objects. In o
implements multiple constructors. This kind of class is useful when you need to create instances u
arguments.
In the COMPAS class Box, some of the alternative constructors are as follows:
- from_corner_corner_height() which allows you to construct a box from the opposite corners of it
- from_width_height_depth() which allows you to construct a box from its width, height and depth
height along Z-axis, and depth along the Y-axis. This constructor will create the box instance arou
place the values of its origin, so it is created at the desired location.
- from_diagonal() which allows you to construct a box from its main diagonal.
my_box = Box.from_corner_corner_height(Point(2, 2, 0), Point(5, 5, 0), 3): Nicht ric
my_box = Box.from_width_height_depth(3, 3, 3)
my_box.frame.point = Point(3.5, 3.5, 1.5): Nicht richtig
my_box = Box.from_diagonal((Point(2, 2, 0), Point(5, 5, 3))): Nicht richtig
All of the above: Richtig
None of the above: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
15 von 16
07.11.2024, 17:10

## S. 16

◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 1 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
16 von 16
07.11.2024, 17:10
