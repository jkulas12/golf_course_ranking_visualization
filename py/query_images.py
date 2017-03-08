
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
def query_image(q):
    q = q.replace(' ', '+')
    result = requests.get(url.format(apiKey, cx, q)).json()['items'][0]
    link = result['link']
    image = requests.get(link, stream = True)
    if image.status_code == 200:
        filename = '../Data/images/' + create_class_name(q.replace('+', ' ')) + '.jpeg'
        with open(filename, 'wb') as f:
            image.raw.decode_content = True
            shutil.copyfileobj(image.raw, f)



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
    courses = sorted(list(load_course_names()))
    i = 0
    for course in courses:
        query_image(course)

