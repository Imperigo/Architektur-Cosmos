---
titel: "Resultate"
quelle: "Studium Andrin (HSLU/ETH)"
datei: "Resultate.pdf"
seiten: 55
ocr-seiten: 0
tags: [bauwissen, vorlesung]
---

# Resultate

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

## S. 17

Frage 16
Falsch
Erreichbare Punkte: 3.00
COMPAS
What does the following Python code snippet do?
from compas.geometry import Vector
v = Vector(1, 2, 3)
v.unitize()
× It returns a unitized (with a length of 1) copy of this vector
× It creates a Vector with coordinates (1, 2, 3)
× It creates a new Point at the origin
✓It scales v in-place to have a length of 1
Bewertungsmethode: SC1/0
Explanation:
The method unitize() of the class Vector scales the vector in place, to have a length of 1.
*NOTE that the method unitized() will instead return a copy of the vector, unitized.
It returns a unitized (with a length of 1) copy of this vector: Nicht richtig
It creates a Vector with coordinates (1, 2, 3): Nicht richtig
It creates a new Point at the origin: Nicht richtig
It scales v in-place to have a length of 1: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 14
07.11.2024, 17:10

## S. 18

Frage 17
Richtig
Erreichbare Punkte: 2.00
COMPAS
Given the following Python code snippet, what will be the result?
from compas.geometry import Point
p1 = Point(1, 2, 3)
p2 = Point(4, 5, 6)
result = p1.distance_to_point(p2)
✓result will contain the distance between p1 and p2
× result will contain the coordinates of p2
× result will contain the dot product of p1 and p2
× The code will raise an error
Bewertungsmethode: SC1/0
Explanation
The Point class of COMPAS has several attributes and methods, among them, there are methods to
objects, such as points. The method distance_to_point() accepts one other point as parameter and 
Euclidian distance between the two. 
result will contain the distance between p1 and p2: Richtig
result will contain the coordinates of p2: Nicht richtig
result will contain the dot product of p1 and p2: Nicht richtig
The code will raise an error: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 14
07.11.2024, 17:10

## S. 19

Frage 18
Richtig
Erreichbare Punkte: 2.00
COMPAS
Assuming the following code:
from compas.geometry import Point
point = Point(10, 20, 5)
How do you access its x coordinate?
✓point.x
× point.x_coordinate
× point.get_x()
× x of point
Bewertungsmethode: SC1/0
Explanation
The Point class of COMPAS contains attributes to access its coordinates, named x, y and z respecti
the dot notation (eg. instance.attribute). In our case, to access the x coordinate of the point variable
this value, we can print it directly using print(point.x). If we want to assign it to a variable: my_var = 
point.x: Richtig
point.x_coordinate: Nicht richtig
point.get_x(): Nicht richtig
x of point: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 14
07.11.2024, 17:10

## S. 20

Frage 19
Richtig
Erreichbare Punkte: 2.00
COMPAS
In the code snippet below, what is the purpose of the Box class method from_width_height_depth?
from compas.geometry import Box
box = Box.from_width_height_depth(4, 3, 2)
✓It creates a new Box with the specified dimensions
× It returns the width, height, and depth of the box.
× It calculates the volume of the box.
× It resizes the existing box to the specified dimensions
Bewertungsmethode: SC1/0
Explanation:
The method from_width_height_depth() is an alternative constructor for the Box class, which will i
and depth.
Note that width is along the X-axis, height along Z-axis, and depth along the Y-axis.
It creates a new Box with the specified dimensions: Richtig
It returns the width, height, and depth of the box.: Nicht richtig
It calculates the volume of the box.: Nicht richtig
It resizes the existing box to the specified dimensions: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 14
07.11.2024, 17:10

## S. 21

Frage 20
Richtig
Erreichbare Punkte: 3.00
Data types
Suppose my_list = [3, 6, 12, 24, 5, 10, 15, 20].
Which of the statements returns the following list [6, 24, 10, 20]?
× print(my_list[-1:-7:-2])
× print(my_list[1:8])
× print(my_list[::2])
✓print(my_list[1::2])
Bewertungsmethode: SC1/0
Explanation:
We can use the following syntax to pick a particular list slice: list_name[start,stop,step].
The order is always [start : stop : step]. By default, start is zero, and step is one. You have the opti
want to keep the defaults. Negative numbers in the start or stop positions mean that the slice will 
print(my_list[-1:-7:-2]): Nicht richtig
print(my_list[1:8]): Nicht richtig
print(my_list[::2]): Nicht richtig
print(my_list[1::2]): Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 14
07.11.2024, 17:10

## S. 22

Frage 21
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following functions converts a string to a float in python?
× int(x)
S
✓float(x)
S
× list(x)
S
× str(x)
S
Bewertungsmethode: SC1/0
Explanation:
In Python, we can convert any data type to a floating-point number, using the built-in method float(
data type of the string to a float. This method only accepts one parameter, and that is also optional 
the method returns 0.
int(x): Nicht richtig
float(x): Richtig
list(x): Nicht richtig
str(x): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 14
07.11.2024, 17:10

## S. 23

Frage 22
Richtig
Erreichbare Punkte: 1.00
Data types
What is the output of the following code?
room_name="Kitchen"
print(room_name)
✓Kitchen
× None
× room_name
× "room_name"
Bewertungsmethode: SC1/0
Explanation:
The statement print(room_name), accesses and prints the value Kitchen of the variable room_name.
Kitchen: Richtig
None: Nicht richtig
room_name: Nicht richtig
"room_name": Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 14
07.11.2024, 17:10

## S. 24

Frage 23
Richtig
Erreichbare Punkte: 1.00
Data types
What is the result of 3 * "tower"?
× tower * 3
× 3tower
✓towertowertower
× tower3
Bewertungsmethode: SC1/0
Explanation:
In Python, you can use the multiplication operator (*) to quickly duplicate or repeat strings, with a 
new_string = original_string * times_to_repeat
So, 3 * "tower" equals to towertowertower.
tower * 3: Nicht richtig
3tower: Nicht richtig
towertowertower: Richtig
tower3: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 14
07.11.2024, 17:10

## S. 25

Frage 24
Richtig
Erreichbare Punkte: 1.00
Data types
How do you create a set of numbers in Python?
✓set([1, 2, 3])
× set(1, 2, 3)
× set[1, 2, 3]
× set<1, 2, 3>
Bewertungsmethode: SC1/0
Explanation:
A set can be created in two ways:
First, you can define a set with the built-in set() function, which only takes a sequence or a list of it
Alternately, a set can be defined with curly braces ({}).
set([1, 2, 3]): Richtig
set(1, 2, 3): Nicht richtig
set[1, 2, 3]: Nicht richtig
set<1, 2, 3>: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 14
07.11.2024, 17:10

## S. 26

Frage 25
Richtig
Erreichbare Punkte: 2.00
Data types
Which of the following statements will not return the float value 23.0?
× print(float("23"))
✓print(float("int: 23"))
× print(float(int(23.2)))
× print(float(23))
Bewertungsmethode: SC1/0
Explanation
• The statement print(float("23")) will cast (convert) the string "23" to the floating-point numb
• The statement print(float(23)) will cast the integer 23 to the floating-point number 23.0.
• The statement print(float(int(23.2))) will first cast the floating-point number 23.2 to the intege
subsequently the method float() will cast the newly created integer 23 to the float 23.0.
• The statement print(float("int: 23")) will try to cast the string "int: 23" to a floating-point num
could not convert string to float: 'int: 23', because it cannot convert the part "int: " to a float.
print(float("23")): Nicht richtig
print(float("int: 23")): Richtig
print(float(int(23.2))): Nicht richtig
print(float(23)): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 14
07.11.2024, 17:10

## S. 27

Frage 26
Richtig
Erreichbare Punkte: 1.00
Data types
What data type is the object below?
a = [1, 23, 'hello', 1]
× tuple
S
✓list
S
× integer
S
× set
S
Bewertungsmethode: SC1/0
Explanation:
The syntax [] defines a list.
tuple: Nicht richtig
list: Richtig
integer: Nicht richtig
set: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 14
07.11.2024, 17:10

## S. 28

Frage 27
Falsch
Erreichbare Punkte: 2.00
Data types
Consider the following code. What will it print?
blueprint = [1, 2, 3, 4]
print(blueprint[1:3])
× [1, 3]
× [1, 2, 3]
× [1, 2, 3, 4]
✓[2, 3]
Bewertungsmethode: SC1/0
Explanation:
Using the slice notation (:) when accessing a list item through its index, with the syntax list[start_ind
simple words, is creating a new list, which is a subset of the initial list. The start_index is inclusive, w
be included in the sliced list, while the end_index is exclusive, which means that the end_index will 
In our case, blueprint[1:3] will create a copy of the blueprint list, including the following elements: [2
[1, 3]: Nicht richtig
[1, 2, 3]: Nicht richtig
[1, 2, 3, 4]: Nicht richtig
[2, 3]: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
12 von 14
07.11.2024, 17:10

## S. 29

Frage 28
Richtig
Erreichbare Punkte: 2.00
Data types
What will the following code print?
a = True
b = False
if a or b:
   print("Coding")
if a and b:
   print("Architecture")
✓"Coding"
× "Architecture"
× "Coding"
"Architecture"
× Nothing
Bewertungsmethode: SC1/0
Explanation
The value of a is True, and the value of b is False. The first conditional (if statement) will check if eit
print "Coding", and since a is True, this line will be printed. The second conditional expects both a A
the case, it will not print "Architecture".
"Coding": Richtig
"Architecture": Nicht richtig
"Coding"
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
13 von 14
07.11.2024, 17:10

## S. 30

"Architecture": Nicht richtig
Nothing: Nicht richtig
◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
14 von 14
07.11.2024, 17:10

## S. 31

Frage 29
Richtig
Erreichbare Punkte: 2.00
Data types
Given a string s = "Welcome", which of the following code is incorrect?
× print(s.lower())
× print(s[0])
✓s[1]="r"
× print(s[:2])
Bewertungsmethode: SC1/0
Explanation:
A string can be considered as a list of characters, so we can iterate through those characters like w
list.
However, there is a core difference between a string and an actual list data type; strings are immuta
means that we can't change the object's state after we have created it. In simple words, If we try to
throw an error.
The statement s[1]="r" tries to replace the value e in the string's index position 1, with the value r, a
print(s.lower()): Nicht richtig
print(s[0]): Nicht richtig
s[1]="r": Richtig
print(s[:2]): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 14
07.11.2024, 17:11

## S. 32

Frage 30
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following is not a valid Python data type?
× list
S
✓struct
S
× tuple
S
× set
S
Bewertungsmethode: SC1/0
Explanation
There is no python data type with the name struct.
list: Nicht richtig
struct: Richtig
tuple: Nicht richtig
set: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 14
07.11.2024, 17:11

## S. 33

Frage 31
Richtig
Erreichbare Punkte: 1.00
Data types
How do you create an empty list in Python?
×
()
S
✓
[]
S
✓
×
{}
S
×
<>
S
Bewertungsmethode: SC1/0
Explanation:
The syntax [] in python defines a new list.
()
: Nicht richtig
[]
: Richtig
{}
: Nicht richtig
<>
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 14
07.11.2024, 17:11

## S. 34

Frage 32
Richtig
Erreichbare Punkte: 2.00
Data types
What will the following code output?
beams = [1, 2, 3, 4] 
print(beams[1])
× 4
S
✓2
S
✓
× 3
S
× 1
S
Bewertungsmethode: SC1/0
Explanation
The first index of a list is 0, the second is 1, and so on. In this code we access index 1, which is the s
value 2.
4: Nicht richtig
2: Richtig
3: Nicht richtig
1: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 14
07.11.2024, 17:11

## S. 35

Frage 33
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following operators allows to concatenate two strings in Python?
×
&
S
×
*
S
✓
+
S
✓
×
,
S
Bewertungsmethode: SC1/0
Explanation:
String concatenation is a pretty common operation consisting of joining two or more strings togethe
Perhaps the quickest way to achieve concatenation is to take two separate strings and combine the
known as the concatenation operator in this context.
&
: Nicht richtig
*
: Nicht richtig
+
: Richtig
,
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 14
07.11.2024, 17:11

## S. 36

Frage 34
Richtig
Erreichbare Punkte: 1.00
Data types
Which is a valid variable name in Python?
× price_in_$
× old-data
✓_output
× 1_data
Bewertungsmethode: SC1/0
Explanation:
There are the two syntax rules we need to follow when we're naming variables:
- We must use only letters, numbers, or underscores (we can't use apostrophes, hyphens, spaces, e
- Variable names can't begin with a number.
price_in_$: Nicht richtig
old-data: Nicht richtig
_output: Richtig
1_data: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 14
07.11.2024, 17:11

## S. 37

Frage 35
Richtig
Erreichbare Punkte: 2.00
Data types
Consider the following code. What will it print?
blueprint = [1, 2, 3, 4]
blueprint[1:3] = [0, 0]
print(blueprint)
× [1, 2, 3, 4]
× [1, 0, 0, 0, 4]
✓[1, 0, 0, 4]
× [2, 3]
Bewertungsmethode: SC1/0
Explanation
Using the slice notation (:) allows accessing items in a list, but when used on the left-hand side of a
replace values in the list. In our case, we select the values between index 1 and 3 using list[start_ind
inclusive, while end_index is exclusive), and replace them with [0, 0]. This results into a list that con
the two zeros that we replaced, and the last item of the original list.
[1, 2, 3, 4]: Nicht richtig
[1, 0, 0, 0, 4]: Nicht richtig
[1, 0, 0, 4]: Richtig
[2, 3]: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 14
07.11.2024, 17:11

## S. 38

Frage 36
Richtig
Erreichbare Punkte: 2.00
Functions
What is the output of the following code:
my_list = ['a','b','c','d']
print("".join(my_list))
× None
✓abcd
× ['a','b','c','d']
× SyntaxError
Bewertungsmethode: SC1/0
Explanation
The method .join() of string objects combines multiple strings. Since it's a method of a string object
example, it's an empty string, so it combines the letters a, b, c and d, using an empty string betwee
"-".join(my_list), we would get "a-b-c-d" as result.
None: Nicht richtig
abcd: Richtig
['a','b','c','d']: Nicht richtig
SyntaxError: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 14
07.11.2024, 17:11

## S. 39

Frage 37
Richtig
Erreichbare Punkte: 2.00
Functions
What is the output of the following code?
def display_info(username, grade='A'):
  print("Username: {}, Grade: {}".format(username, grade))
display_info("ETH_Amazing_Student")
× Username: ETH_Amazing_Student
× TypeError
× Username: ETH_Amazing_Student, Grade:
✓Username: ETH_Amazing_Student, Grade: A
Bewertungsmethode: SC1/0
Explanation
The parameter grade has a default value of "A", so even if we don't pass a value for that parameter, 
that default.
Username: ETH_Amazing_Student: Nicht richtig
TypeError: Nicht richtig
Username: ETH_Amazing_Student, Grade:: Nicht richtig
Username: ETH_Amazing_Student, Grade: A: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 14
07.11.2024, 17:11

## S. 40

Frage 38
Richtig
Erreichbare Punkte: 2.00
Functions
Which function returns a sequence of numbers starting from 0 by default?
× loop()
S
× for()
S
✓range()
S
× list()
S
Bewertungsmethode: SC1/0
Explanation:
The range() function returns a sequence of numbers, starting from 0 by default, and increments b
specified number.
Syntax: range(start, stop, step)
start
(Optional) An integer number specifying at which position to start. Default is 0
stop
(Required) An integer number specifying at which position to stop (not included)
step
(Optional) An integer number specifying the increment. Default is 1
loop(): Nicht richtig
for(): Nicht richtig
range(): Richtig
list(): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 14
07.11.2024, 17:11

## S. 41

Frage 39
Richtig
Erreichbare Punkte: 1.00
Functions
Suppose my_list = [3, 4, 5, 20, 5, 25, 1, 3].
What is my_list after my_list .pop(1)?
✓[3, 5, 20, 5, 25, 1, 3]
× [3, 4, 5, 20, 5, 25, 1, 3]
× [1, 3, 4, 5, 20, 5, 25]
× [1, 3, 3, 4, 5, 5, 20, 25]
Bewertungsmethode: SC1/0
Explanation:
pop(i) removes the i index element from the list.
[3, 5, 20, 5, 25, 1, 3]: Richtig
[3, 4, 5, 20, 5, 25, 1, 3]: Nicht richtig
[1, 3, 4, 5, 20, 5, 25]: Nicht richtig
[1, 3, 3, 4, 5, 5, 20, 25]: Nicht richtig
th
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 14
07.11.2024, 17:11

## S. 42

Frage 40
Richtig
Erreichbare Punkte: 2.00
Functions
If you have two lists, a = [1, 2, 3] and b = [4, 5, 6], which function could you use to print (1,4
× for x in a and y in b:
print(x, y)
✓for x, y in zip(a, b):
print(x, y)
× for x in a, y in b:
print(x, y)
× for (x,y) in (a,b):
print(x, y)
Bewertungsmethode: SC1/0
Explanation
The zip() function will combine two or more lists and returns a new list formed by the pairs (or triple
the lists.
for x in a and y in b:
print(x, y)
: Nicht richtig
for x, y in zip(a, b):
print(x, y)
: Richtig
for x in a, y in b:
print(x, y)
: Nicht richtig
for (x,y) in (a,b):
print(x, y)
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
12 von 14
07.11.2024, 17:11

## S. 43

Frage 41
Falsch
Erreichbare Punkte: 2.00
Functions
What is the output of the following code?
def is_negative(value):
   return value < 0
print(is_negative(-4))
× None
S
✓True
S
× -4
S
× False
S
Bewertungsmethode: SC1/0
Explanation
The return of the function is_negative() is a expression using comparison operators, this means tha
False). In our case, when we call the function is_negative with the value -4, the function will return F
zero.
None: Nicht richtig
True: Richtig
-4: Nicht richtig
False: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
13 von 14
07.11.2024, 17:11

## S. 44

Frage 42
Richtig
Erreichbare Punkte: 1.00
Functions
What is called when a function is defined inside a class?
× another function
✓method
× class
× module
Bewertungsmethode: SC1/0
another function: Nicht richtig
method: Richtig
class: Nicht richtig
module: Nicht richtig
◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
14 von 14
07.11.2024, 17:11

## S. 45

Frage 43
Richtig
Erreichbare Punkte: 2.00
Functions
What will be the output of the following code:
print(type(3))
× None
× <type 'type'>
× 3
✓<type 'int'>
Bewertungsmethode: SC1/0
Explanation: 
The type() function returns the class of the argument the object belongs to. Thus, type(3) <type 'in
None: Nicht richtig
<type 'type'>: Nicht richtig
3: Nicht richtig
<type 'int'>: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 11
07.11.2024, 17:11

## S. 46

Frage 44
Richtig
Erreichbare Punkte: 2.00
Functions
What value is returned by a function that doesn't have a return statement?
× 1
S
✓None
S
× False
S
× 0
S
Bewertungsmethode: SC1/0
Explanation:
A return-less function always returns None. None also is returned if we have only a return keyword i
1: Nicht richtig
None: Richtig
False: Nicht richtig
0: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 11
07.11.2024, 17:11

## S. 47

Frage 45
Richtig
Erreichbare Punkte: 1.00
Functions
What is the correct syntax to define a function in Python?
×
define my_func():
×
function my_func():
×
create my_func():
✓
def my_func():
Bewertungsmethode: SC1/0
Explanation:
To define a function in Python, we have to use the def keyword.
define my_func():
: Nicht richtig
function my_func():
: Nicht richtig
create my_func():
: Nicht richtig
def my_func():
: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 11
07.11.2024, 17:11

## S. 48

Frage 46
Richtig
Erreichbare Punkte: 2.00
Functions
Which function is used to get the amount of elements of a list?
✓
len()
S
×
length()
S
×
count()
S
×
size()
S
Bewertungsmethode: SC1/0
Explanation
The len() function is a built-in function that returns the length of lists and other sequence types. It's
the class list, but a function that python offers as part of the basic functionality of the language.
len()
: Richtig
length()
: Nicht richtig
count()
: Nicht richtig
size()
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 11
07.11.2024, 17:11

## S. 49

Frage 47
Richtig
Erreichbare Punkte: 3.00
Loops
What will the following nested loop output?
for x in range(2):
   for y in range(2):
       print(x, y)
×
(0, 0)
(1, 1)
(0, 1)
(1, 0)
S
×
(0, 0)
(1, 1)
(1, 0)
(0, 1)
S
✓
(0, 0)
(0, 1)
(1, 0)
(1, 1)
S
✓
×
(1, 1)
(1, 0)
(0, 1)
(0, 0)
S
Bewertungsmethode: SC1/0
Explanation
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 11
07.11.2024, 17:11

## S. 50

Nested loops mean there is a loop inside another loop.
In this case, the outer loop (for x in range(2):) will iterate over the values 0 and 1 because range(2)
starting from 0 and up to, but not including, 2.
The inner loop (for y in range(2):) will also iterate over the values 0 and 1, just like the outer loop.
So, when the code is executed:
• In the first iteration of the outer loop, x is 0.
• Then, in the inner loop, when y is 0, it prints 0 0.
• In the next iteration of the inner loop, y becomes 1, and it prints 0 1.
• In the next iteration of the outer loop, x is 1.
• Again, in the inner loop, when y is 0, it prints 1 0.
• In the next iteration of the inner loop, y becomes 1, and it prints 1 1.
(0, 0)
(1, 1)
(0, 1)
(1, 0)
: Nicht richtig
(0, 0)
(1, 1)
(1, 0)
(0, 1)
: Nicht richtig
(0, 0)
(0, 1)
(1, 0)
(1, 1)
: Richtig
(1, 1)
(1, 0)
(0, 1)
(0, 0)
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 11
07.11.2024, 17:11

## S. 51

Frage 48
Richtig
Erreichbare Punkte: 2.00
Loops
How would you use a for loop to iterate over the numbers 0 through 4?
× for 5 in items:
× for i in range(4):
✓for i in range(5):
× for i in range(1, 5):
Bewertungsmethode: SC1/0
Explanation
Using a for loop in combination with the range() function is a common pattern. It is important to not
as the end of the range is not-included, that's why range(5) will generate numbers from 0 until 4, ex
for 5 in items:: Nicht richtig
for i in range(4):: Nicht richtig
for i in range(5):: Richtig
for i in range(1, 5):: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 11
07.11.2024, 17:11

## S. 52

Frage 49
Richtig
Erreichbare Punkte: 2.00
Loops
What is the primary purpose of a for loop in Python?
× To execute a function.
× To check a conditional statement multiple times.
×
To store multiple values in a list.
✓To iterate over a sequence or iterable.
Bewertungsmethode: SC1/0
Explanation:
Iteration means executing the same block of code over and over. A programming structure that im
In programming, there are two types of iteration, indefinite and definite:
-With indefinite iteration, the number of times the loop is executed isn’t specified explicitly in adva
executed repeatedly as long as some condition is met.
-With definite iteration, the number of times the designated block will be executed is specified exp
Definite iteration loops are frequently referred to as for loops, because for is the keyword that is us
programming languages, including Python.
Python’s for loop looks like this:
for <var> in <iterable>:
   <statement(s)>
<iterable> is a collection of objects—for example, a list or tuple.
The <statement(s)> in the loop body are denoted by indentation, as with all Python control structur
item in <iterable>.
The loop variable <var> takes on the value of the next element in <iterable>, each time through the 
To execute a function.: Nicht richtig
To check a conditional statement multiple times.: Nicht richtig
To store multiple values in a list.
: Nicht richtig
To iterate over a sequence or iterable.: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 11
07.11.2024, 17:11

## S. 53

Frage 50
Richtig
Erreichbare Punkte: 1.00
Operators
What is the output of the following program: 
print(1 + 2 == 3)
× 3
× "1 + 2 == 3"
✓True
× Error
Bewertungsmethode: SC1/0
Explanation:
In Python, we have the following comparison operators: <, >, <=, >=, ==, !=.
A statement containing a comparison operator will result in a boolean value, in our case 1 + 2 == 3 r
We then pass this True value as an argument to the print() funtion, which will print True.
3: Nicht richtig
"1 + 2 == 3": Nicht richtig
True: Richtig
Error: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 11
07.11.2024, 17:11

## S. 54

Frage 51
Richtig
Erreichbare Punkte: 1.00
Statements
Which of the following will produce a SyntaxError?
✓print('Architect's design')
× print('Architect s design')
× print('Architect"s design')
× print("Architect's design")
Bewertungsmethode: SC1/0
Explanation:
print('Architect's design') gives an invalid syntax error, because a single quote ' after Architect, is co
the rest becomes part of an open string.
It can be corrected as: print("Architect's design"), by alternating the quotes type (single-quote or d
the quotes printed, with the parts that the quotes define the string.
print('Architect's design'): Richtig
print('Architect s design'): Nicht richtig
print('Architect"s design'): Nicht richtig
print("Architect's design"): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 11
07.11.2024, 17:11

## S. 55

Frage 52
Richtig
Erreichbare Punkte: 1.00
Statements
Assuming the room_size variable is initialized with zero, which of the following is an incorrect assig
× room_size += 7
× room_size = room_size + 7
✓room_size + 7 = room_size
× None of the above
Bewertungsmethode: SC1/0
Explanation:
The left-hand side of the assignment statement does have to be a valid Python variable name.
room_size += 7: Nicht richtig
room_size = room_size + 7: Nicht richtig
room_size + 7 = room_size: Richtig
None of the above: Nicht richtig
◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 4 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 11
07.11.2024, 17:11
