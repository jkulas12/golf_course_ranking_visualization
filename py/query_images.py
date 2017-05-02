
import requests
import os
import sys
import re
import shutil
from os import listdir
import json
import simplejson


## API variables
url = 'https://www.googleapis.com/customsearch/v1?key={}&cx={}&searchType=image&q={}'
apiKey = 'AIzaSyC3ppHc7C9q_wcdVSv96BNN4TxE-VBd8Qc'
cx = '012127496796203121782:23djzwsbsue'


# q is query string in human readable form (display name)
def query_image(course, isLogo):
    if isLogo:
        if 'golf' in course:
            q = 'logo ' + course + ' logo'
        else:
            q = 'logo ' + course + 'golf course logo'
        q = q.replace(' ', '+').replace('(','+').replace(')','+')
    else:
        if 'golf' not in course:
            q = course + ' golf course'
            q = q.replace(' ', '+')
        else:
            q = course.replace(' ', '+')
    print(url.format(apiKey, cx, q))
    result = requests.get(url.format(apiKey, cx, q)).json()['items'][0]
    link = result['link']
    image = requests.get(link, stream = True)
    if image.status_code == 200:
        if isLogo:
            data_path = '../Data/images/logos/'
        else:
            data_path = '../Data/images/course_pictures/'
        filename = data_path + create_class_name(course.replace('+', ' ')) + '.jpeg'
        with open(filename, 'wb') as f:
            image.raw.decode_content = True
            shutil.copyfileobj(image.raw, f)
    else:
        print(image.status_code)



def create_class_name(course_name):
    course_name = course_name.replace("'",'').replace('.', '').replace('"','')\
        .replace(' ', '_').replace('&','').replace('-','_').replace('(','').replace(')','').lower()
    return course_name

def load_course_names():
    cwd = os.getcwd() + '/../'
    data_path = cwd + 'Data/Rankings/'
    rankings = [rank for rank in listdir(data_path) if rank[0] != '.']
    course_name_set = set()
    for r in rankings:
        with open(data_path + r) as f:
            ranking = simplejson.load(f)
        for course in ranking['Courses']:
            course_name_set.add(course['CourseName'])
    return course_name_set

if __name__ == '__main__':
    # last_course = "Wolf Creek Golf Club"
    # courses = sorted(list(load_course_names()))
    # start_index = courses.index(last_course) + 1



    # for i in range(start_index, len(courses)):
    #     print('querying course: ' + courses[i])
    #     try:
    #         query_image(courses[i], False)
    #     except:
    #         print('failed')

    course_name = "Oakland Hills(South)"
    query_image(course_name, False)