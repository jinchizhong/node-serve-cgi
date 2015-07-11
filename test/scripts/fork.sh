#!/bin/sh

myfunc()
{
	exec 1>&- 2>&- <&-
	sleep 5
}

echo 'hello'

myfunc &
